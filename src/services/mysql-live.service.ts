import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import LiveMysql from 'mysql-live-select';
import { BaseTransactionName, TransactionEventDto, TransactionMessageDto, TransactionStatus } from 'src/dtos/transaction.dto';
import { approvedTransaction, DbAppTransaction, getRelatedInputs, newTransaction } from 'src/entities';
import { AppGateway } from 'src/gateway/app.gateway';
import { getManager } from 'typeorm';
import { exec } from 'src/utils/promise-helper';

const firstRunMap = {};

export enum SocketEvents {
  NewTransactionCreated = 'deposit_transaction_created',
  TransactionCompleted = 'deposit_transaction_completed',
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
      const event = SocketEvents.TransactionCompleted;
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

  async eventHandler(event: SocketEvents, transactionEvents: any[]) {
    const msgPromises = [];
    if (!transactionEvents?.length) return;
    let totalSentToPublic = 0;
    const addressSubscribersMap = this.gateway.addressSubscribersMap || {};
    const transactionSubscribersMap = this.gateway.transactionSubscribersMap || [];
    try {
      for (const transactionEvent of transactionEvents) {
        const parsedTransaction = await parseTransactionEvent(transactionEvent);
        this.logger.debug(`about to send event:${event} message: ${JSON.stringify(transactionEvent)}`);

        for (const [socketId, addressHash] of Object.entries(addressSubscribersMap)) {
          if (addressHash === transactionEvent.rbtAddressHash) {
            const totalTransactions = await this.getTotalTransactions(addressHash);
            msgPromises.push(this.gateway.sendMessageToRoom(socketId, `${SocketEvents.AddressTransactionsNotification}/${transactionEvent.rbtAddressHash}`, parsedTransaction));
            msgPromises.push(
              this.gateway.sendMessageToRoom(socketId, `${SocketEvents.AddressTransactionsNotification}/${transactionEvent.rbtAddressHash}/total`, totalTransactions),
            );
          }
        }

        for (const [socketId, hash] of Object.entries(transactionSubscribersMap)) {
          if (hash === transactionEvent.hash) {
            msgPromises.push(this.gateway.sendMessageToRoom(socketId, `${SocketEvents.TransactionDetails}/${transactionEvent.hash}`, parsedTransaction));
          }
        }
        if (totalSentToPublic < 20) {
          const totalTransactions = await this.getTotalTransactions();
          msgPromises.push(this.gateway.sendBroadcast(SocketEvents.GeneralTransactionsNotification, parsedTransaction));
          msgPromises.push(this.gateway.sendBroadcast(`${SocketEvents.GeneralTransactionsNotification}/total`, totalTransactions));
          totalSentToPublic += 1;
        }
      }

      await Promise.all(msgPromises);
    } catch (error) {
      this.logger.error(`Failed to send to socket: ${error}`);
      throw error;
    }
  }
}

async function parseTransactionEvent(transactionEvent: TransactionEventDto): Promise<TransactionMessageDto> {
  const ibts = await getRelatedInputs(transactionEvent.id);
  const rbt = {
    name: BaseTransactionName.RECEIVER,
    addressHash: transactionEvent.rbtAddressHash,
    amount: transactionEvent.rbtAmount,
    originalAmount: transactionEvent.rbtOriginalAmount,
    createTime: transactionEvent.rbtCreateTime,
    hash: transactionEvent.rbtHash,
  };
  const ffbt = {
    name: BaseTransactionName.FULL_NODE_FEE,
    addressHash: transactionEvent.ffbtAddressHash,
    amount: transactionEvent.ffbtAmount,
    originalAmount: transactionEvent.ffbtOriginalAmount,
    createTime: transactionEvent.ffbtCreateTime,
    hash: transactionEvent.ffbtHash,
  };
  const nfbt = {
    name: BaseTransactionName.NETWORK_FEE,
    addressHash: transactionEvent.nfbtAddressHash,
    amount: transactionEvent.nfbtAmount,
    originalAmount: transactionEvent.nfbtOriginalAmount,
    createTime: transactionEvent.nfbtCreateTime,
    hash: transactionEvent.nfbtHash,
  };

  const status =
    transactionEvent.transactionConsensusUpdateTime && transactionEvent.transactionConsensusUpdateTime > 0 ? TransactionStatus.CONFIRMED : TransactionStatus.ATTACHED_TO_DAG;

  return {
    status,
    transactionData: {
      attachmentTime: new Date(transactionEvent.attachmentTime * 1000),
      createTime: transactionEvent.createTime,
      hash: transactionEvent.hash,
      amount: transactionEvent.amount,
      baseTransactions: [...ibts, rbt, ffbt, nfbt],
      type: transactionEvent.type,
      leftParentHash: transactionEvent.leftParentHash,
      rightParentHash: transactionEvent.rightParentHash,
      trustChainConsensus: transactionEvent.trustChainConsensus === 0 ? null : transactionEvent.trustChainConsensus,
      trustChainTrustScore: transactionEvent.trustChainTrustScore,
      senderHash: transactionEvent.senderHash,
      senderTrustScore: transactionEvent.senderTrustScore,
      isValid: transactionEvent.isValid,
      transactionDescription: transactionEvent.transactionDescription,
      transactionConsensusUpdateTime: transactionEvent.transactionConsensusUpdateTime,
    },
  };
}
