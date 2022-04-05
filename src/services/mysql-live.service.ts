import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import LiveMysql from 'mysql-live-select';
import { TransactionDto } from 'src/dtos/transaction.dto';
import { DbAppTransaction, getConfirmedTransactions, getNewTransactions, getTransactionsCount } from 'src/entities';
import { AppGateway } from 'src/gateway/app.gateway';
import { getManager } from 'typeorm';
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
    user: this.configService.get<string>('DB_SYNC_USER_LIVE'),
    password: this.configService.get<string>('DB_SYNC_PASSWORD_LIVE'),
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

    this.liveConnection
      .select(getNewTransactions(), [
        {
          table: `transactions`,
        },
      ])
      .on('update', async (diff: Diff, data: any[]) => {
        const event = SocketEvents.NewTransactionCreated;
        if (!firstRunMap[event]) {
          firstRunMap[event] = true;
          return;
        }
        if (diff.added && diff.added.length > 0) {
          await this.eventHandler(event, diff.added);
        }
      });

    this.liveConnection
      .select(getConfirmedTransactions(), [
        {
          table: `transactions`,
        },
      ])
      .on('update', (diff: Diff, data: any[]) => {
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

  async getTotalTransactionCountMap(addresses: string[]): Promise<{ [key: string]: number }> {
    const [totalTransactionsError, totalTransactions] = await exec(getTransactionsCount(addresses));
    if (totalTransactionsError) {
      throw totalTransactionsError;
    }
    return totalTransactions;
  }

  async getTransactionsById(transactionIds: string[]) {
    const manager = getManager('db_sync');
    try {
      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('transactions')
        .leftJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
        .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
        .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
        .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions')
        .where(`transactions.id IN(${transactionIds.join(',')})`);
      const [transactionsError, transactions] = await exec(query.getMany());
      if (transactionsError) {
        throw transactionsError;
      }
      return transactions;
    } catch (error) {
      this.logger.error(error);
    }
  }
  getTransactionAddressesToNotify(transaction: DbAppTransaction): string[] {
    const addressToNotifyMap = {};
    for (const bt of transaction.inputBaseTransactions) {
      addressToNotifyMap[bt.addressHash] = 1;
    }
    for (const bt of transaction.receiverBaseTransactions) {
      addressToNotifyMap[bt.addressHash] = 1;
    }
    for (const bt of transaction.fullnodeFeeBaseTransactions) {
      addressToNotifyMap[bt.addressHash] = 1;
    }
    for (const bt of transaction.networkFeeBaseTransactions) {
      addressToNotifyMap[bt.addressHash] = 1;
    }
    return Object.keys(addressToNotifyMap);
  }
  getTransactionsAddressesToNotify(transactions: DbAppTransaction[]): string[] {
    const addressToNotifyMap = {};
    for (const transaction of transactions) {
      for (const bt of transaction.inputBaseTransactions) {
        addressToNotifyMap[bt.addressHash] = 1;
      }
      for (const bt of transaction.receiverBaseTransactions) {
        addressToNotifyMap[bt.addressHash] = 1;
      }
      for (const bt of transaction.fullnodeFeeBaseTransactions) {
        addressToNotifyMap[bt.addressHash] = 1;
      }
      for (const bt of transaction.networkFeeBaseTransactions) {
        addressToNotifyMap[bt.addressHash] = 1;
      }
    }
    return Object.keys(addressToNotifyMap);
  }
  async eventHandler(event: SocketEvents, transactionEvents: any[]) {
    const msgPromises = [];
    if (!transactionEvents?.length) return;

    try {
      const transactionIds = transactionEvents.map(x => x.id);
      const transactionEntities = await this.getTransactionsById(transactionIds);
      const allAddressesToNotify = this.getTransactionsAddressesToNotify(transactionEntities);
      const addressTotalTransactionCountMap = await this.getTotalTransactionCountMap(allAddressesToNotify);
      for (const transaction of transactionEntities) {
        const addressesToNotify = this.getTransactionAddressesToNotify(transaction);

        const eventMessage = new TransactionDto(transaction);
        this.logger.debug(`about to send event:${event} message: ${JSON.stringify(eventMessage)}`);
        for (const addressToNotify of addressesToNotify) {
          msgPromises.push(this.gateway.sendMessageToRoom(addressToNotify, `${SocketEvents.AddressTransactionsNotification}/${addressToNotify}`, eventMessage));
          msgPromises.push(
            this.gateway.sendMessageToRoom(
              addressToNotify,
              `${SocketEvents.AddressTransactionsNotification}/${addressToNotify}/total`,
              addressTotalTransactionCountMap[addressToNotify],
            ),
          );
        }

        msgPromises.push(this.gateway.sendMessageToRoom(transaction.hash, `${SocketEvents.TransactionDetails}/${transaction.hash}`, eventMessage));
        msgPromises.push(this.gateway.sendBroadcast(SocketEvents.GeneralTransactionsNotification, eventMessage));
      }

      await Promise.all(msgPromises);
    } catch (error) {
      this.logger.error(`Failed to send to socket: ${error}`);
    }
  }
}
