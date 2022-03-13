import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import LiveMysql from 'mysql-live-select';
import { BaseTransactionName, TransactionDto, TransactionEventDto, TransactionMessageDto, TransactionStatus } from 'src/dtos/transaction.dto';
import { approvedTransaction, DbAppTransaction, getRelatedInputs, newTransaction } from 'src/entities';
import { AppGateway } from 'src/gateway/app.gateway';
import { getManager, In } from 'typeorm';
import { exec } from 'src/utils/promise-helper';

const firstRunMap = {};

export enum SocketEvents {
  NewTransactionCreated = 'deposit_transaction_created',
  TransactionConfirmed = 'deposit_transaction_confirmed',
  GeneralTransactionsNotification = '/topic/transactions',
  AddressTransactionsNotification = '/topic/addressTransactions',
  TransactionDetails = '/topic/transactionDetails',
}

type MonitoredTx = {
  index: number;
  amount: number;
  cotiUsdPrice: number;
  consensusTime: number;
  hash: string;
  createTime: string;
  isHandled: number;
  walletHash: string;
  _index: number;
};
type Diff = {
  removed: MonitoredTx[];
  moved: MonitoredTx[];
  copied: MonitoredTx[];
  added: MonitoredTx[];
};

@Injectable()
export class MysqlLiveService {
  private readonly logger = new Logger('MysqlLiveService');
  settings = {
    host: this.configService.get<string>('DB_SYNC_HOST'),
    port: this.configService.get<number>('DB_SYNC_PORT'),
    user: this.configService.get<string>('DB_SYNC_USER'),
    password: this.configService.get<string>('DB_SYNC_PASSWORD'),
    database: this.configService.get<string>('DB_SYNC_NAME'),
    serverId: Math.floor(Math.random() * 100000 + 1),
    pool: true,
    minInterval: 200,
    timezone: 'utc',
    connectTimeout: 10 * 60 * 60 * 1000,
  };
  isInit = false;
  liveConnection: any;

  constructor(private gateway: AppGateway, private readonly configService: ConfigService) {
    this.init();
  }

  async init() {
    this.onBeforeExit();
    this.liveConnection = new LiveMysql(this.settings);
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          reject(`Timeout in live database connection`);
        }, 10000);
        this.liveConnection
          .on('ready', () => {
            this.logger.log(`Live Database connection - Ready`);
            clearTimeout(timeout);
            resolve(null);
          })
          .on('error', (err: any) => {
            clearTimeout(timeout);
            if (this.isInit) {
              throw new Error(err);
            }
            reject(`Error in live database connection: ${err.message}`);
          });
      });
    } catch (error) {
      return Promise.reject(error);
    }

    this.liveConnection.select(newTransaction(), [{ table: `transactions` }]).on('update', async (diff: Diff, data: any[]) => {
      const event = SocketEvents.NewTransactionCreated;
      if (!firstRunMap[event]) {
        firstRunMap[event] = true;
        return;
      }
      if (diff.added && diff.added.length > 0) {
        await this.eventHandler(event, diff.added);
      }
    });

    this.liveConnection.select(approvedTransaction(), [{ table: `transactions` }]).on('update', (diff: Diff, data: any[]) => {
      const event = SocketEvents.TransactionConfirmed;
      if (!firstRunMap[event]) {
        firstRunMap[event] = true;
        return;
      }
      if (diff.added && diff.added.length > 0) {
        this.eventHandler(event, diff.added);
      }
    });
  }

  onBeforeExit(): void {
    process.once('beforeExit', () => {
      try {
        if (this.liveConnection) {
          this.logger.log(`Ending live connection`);
          this.liveConnection.end();
        }
      } catch (e) {
        this.logger.error(`Error while ending live connection: ${e}`);
      }
    });
  }

  async getTotalTransactions(address?: string) {
    const manager = getManager('db_sync');
    let query = manager
      .getRepository<DbAppTransaction>('transactions')
      .createQueryBuilder('transactions')
      .leftJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
      .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
      .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
      .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions');

    query = address
      ? query
          .where('receiver_base_transactions.addressHash=:address', {
            address,
          })
          .orWhere('input_base_transactions.addressHash=:address', {
            address,
          })
      : query;

    const [totalTransactionsError, totalTransactions] = await exec(query.getCount());
    if (totalTransactionsError) {
      throw totalTransactionsError;
    }

    return totalTransactions;
  }
  async getTransactionsById(transactionIds: string[]) {
    const manager = getManager('db_sync');
    try {
      let query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('transactions')
        .leftJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
        .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
        .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
        .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions')
        .where(`transactions.id IN(${transactionIds.join(',')})`);

      const [transactionsError, transactions] = await exec(query.orderBy({ attachmentTime: 'DESC' }).getMany());
      if (transactionsError) {
        throw transactionsError;
      }
      return transactions;
    } catch (error) {
      this.logger.error(error);
    }
  }
  async eventHandler(event: SocketEvents, transactionEvents: any[]) {
    const msgPromises = [];
    if (!transactionEvents?.length) return;
    const addressSubscribersMap = this.gateway.addressSubscribersMap || {};
    const transactionSubscribersMap = this.gateway.transactionSubscribersMap || [];

    try {
      const transactionIds = transactionEvents.map(x => x.id);
      const transactionEntities = await this.getTransactionsById(transactionIds);
      const totalTransactions = await this.getTotalTransactions();

      for (const transaction of transactionEntities) {
        const receiverAddress = transaction.receiverBaseTransactions.length ? transaction.receiverBaseTransactions[0].addressHash : undefined;
        const eventMessage = new TransactionDto(transaction);
        this.logger.debug(`about to send event:${event} message: ${JSON.stringify(eventMessage)}`);

        for (const [socketId, addressHash] of Object.entries(addressSubscribersMap)) {
          if (addressHash === receiverAddress) {
            msgPromises.push(this.gateway.sendMessageToRoom(socketId, `${SocketEvents.AddressTransactionsNotification}/${receiverAddress}`, eventMessage));
            msgPromises.push(this.gateway.sendMessageToRoom(socketId, `${SocketEvents.AddressTransactionsNotification}/${receiverAddress}/total`, totalTransactions));
          }
        }

        for (const [socketId, hash] of Object.entries(transactionSubscribersMap)) {
          if (hash === eventMessage.hash) {
            msgPromises.push(this.gateway.sendMessageToRoom(socketId, `${SocketEvents.TransactionDetails}/${eventMessage.hash}`, eventMessage));
          }
        }

        msgPromises.push(this.gateway.sendBroadcast(SocketEvents.GeneralTransactionsNotification, eventMessage));
        msgPromises.push(this.gateway.sendBroadcast(`${SocketEvents.GeneralTransactionsNotification}/total`, totalTransactions));
      }

      await Promise.all(msgPromises);
    } catch (error) {
      this.logger.error(`Failed to send to socket: ${error}`);
      throw error;
    }
  }
}
