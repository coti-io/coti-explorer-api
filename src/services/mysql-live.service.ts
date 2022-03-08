import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import LiveMysql from 'mysql-live-select';
import { BaseTransactionName, TransactionEventDto, TransactionMessageDto } from 'src/dtos/transaction.dto';
import { approvedTransaction, getRelatedInputs, newTransaction } from 'src/entities';
import { AppGateway } from 'src/gateway/app.gateway';
let firstRun = true;

export enum SocketEvents {
  NewTransactionCreated = 'deposit_transaction_created',
  TransactionCompleted = 'deposit_transaction_completed',
  GeneralTransactionsNotification = '/topic/transactions',
  AddressTransactionsNotification = '/topic/addressTransactions',
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
      if (diff.added && diff.added.length > 0) {
        await this.eventHandler(event, diff.added);
      }
    });

    this.liveConnection.select(approvedTransaction(), [{ table: `transactions` }]).on('update', (diff: Diff, data: any[]) => {
      const event = SocketEvents.TransactionCompleted;
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

  async eventHandler(event: SocketEvents, transactionEvents: any[]) {
    const msgPromises = [];
    if (firstRun) {
      firstRun = false;
      return;
    }
    if (!transactionEvents?.length) return;

    try {
      for (const transactionEvent of transactionEvents) {
        const socketIds = this.gateway.addressSubscribersMap || [];
        const parsedTransaction = await parseTransactionEvent(transactionEvent);
        this.logger.debug(`about to send event:${event} message: ${JSON.stringify(transactionEvent)}`);

        for (const [socketId, addressHash] of Object.entries(socketIds)) {
          if (addressHash === transactionEvent.receiverAddressHash) {
            msgPromises.push(
              this.gateway.sendMessageToRoom(socketId, `${SocketEvents.AddressTransactionsNotification}/${transactionEvent.receiverAddressHash}`, parsedTransaction),
            );
          }
        }

        msgPromises.push(this.gateway.sendBroadcast(SocketEvents.GeneralTransactionsNotification, parsedTransaction));
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
    addressHash: transactionEvent.receiverAddressHash,
  };
  const ffbt = {
    name: BaseTransactionName.FULL_NODE_FEE,
    amount: transactionEvent.ffbtAmount,
  };
  const nfbt = {
    name: BaseTransactionName.NETWORK_FEE,
    amount: transactionEvent.nfbtAmount,
  };

  return {
    transactionData: {
      date: Number(transactionEvent.attachmentTime),
      txHash: transactionEvent.hash,
      amount: transactionEvent.amount,
      baseTransactions: [...ibts, rbt, ffbt, nfbt],
      type: transactionEvent.type,
      transactionConsensusUpdateTime: transactionEvent.transactionConsensusUpdateTime,
    },
  };
}
