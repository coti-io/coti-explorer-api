import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import LiveMysql from 'mysql-live-select';
import { DbAppTransaction, getConfirmedTransactions, getNewTransactions, getTransactionsById, getTransactionsCount, TransactionDto } from '@app/shared';
import { AppGateway } from '../gateway';
import { getManager } from 'typeorm';
import { exec } from '@app/shared';

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
    host: this.configService.get<string>('DB_APP_HOST'),
    port: this.configService.get<number>('DB_APP_PORT'),
    user: this.configService.get<string>('DB_APP_USER_LIVE'),
    password: this.configService.get<string>('DB_APP_PASSWORD_LIVE'),
    database: this.configService.get<string>('DB_APP_NAME'),
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

  async init(): Promise<void> {
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
    for (const bt of transaction.tokenGenerationFeeBaseTransactions) {
      addressToNotifyMap[bt.addressHash] = 1;
    }
    for (const bt of transaction.tokenMintingFeeBaseTransactions) {
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
      for (const bt of transaction.tokenGenerationFeeBaseTransactions) {
        addressToNotifyMap[bt.addressHash] = 1;
      }
      for (const bt of transaction.tokenMintingFeeBaseTransactions) {
        addressToNotifyMap[bt.addressHash] = 1;
      }
    }
    return Object.keys(addressToNotifyMap);
  }

  getTransactionsCurrencyHash(transactions: DbAppTransaction[]): string[] {
    const currencyHashMap = {};
    for (const tx of transactions) {
      for (const bt of tx.inputBaseTransactions) {
        if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
      }
      for (const bt of tx.receiverBaseTransactions) {
        if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
      }
      for (const bt of tx.fullnodeFeeBaseTransactions) {
        if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
      }
      for (const bt of tx.networkFeeBaseTransactions) {
        if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
      }
      for (const bt of tx.tokenGenerationFeeBaseTransactions) {
        if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
      }
      for (const bt of tx.tokenMintingFeeBaseTransactions) {
        if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
      }
    }

    return Object.keys(currencyHashMap);
  }
  async eventHandler(event: SocketEvents, transactionEvents: any[]) {
    const msgPromises = [];
    if (!transactionEvents?.length) return;

    try {
      const transactionIds = transactionEvents.map(x => x.id);
      const transactionEntities = await getTransactionsById(transactionIds);
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
