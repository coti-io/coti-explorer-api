import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import LiveMysql from 'mysql-live-select';
import { DbAppTransaction, exec, getTokensSymbols, getTransactionsById, getTransactionsCount, getTransactionsQuery, TransactionDto } from '@app/shared';
import { AppGateway } from '../gateway';

const firstRunMap = {};

export enum SocketEvents {
  GeneralTransactionsNotification = 'transactions',
  AddressTransactionsNotification = 'addressTransactions',
  AddressTransactionsTotalNotification = 'addressTransactionsTotal',
  NodeTransactionsNotification = 'nodeTransactions',
  TokenTransactionsNotification = 'tokenTransactions',
  TransactionDetails = 'transactionDetails',
  NodeUpdates = 'nodeUpdates',
  TransactionConfirmationUpdate = 'transactionConfirmationUpdate',
  TreasuryTotalsUpdates = 'treasuryTotalsUpdates',
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
    this.init().catch(error => this.logger.error(error));
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
      .select(getTransactionsQuery(), [
        {
          table: `transactions`,
        },
      ])
      .on('update', async (diff: Diff) => {
        const event = 'SocketEvents.NewTransactionCreated';
        if (!firstRunMap[event]) {
          firstRunMap[event] = true;
          return;
        }
        if (diff.added && diff.added.length > 0) {
          await this.eventHandler(diff.added);
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

  getTransactionCurrencyHashesToNotify(transaction: DbAppTransaction): string[] {
    const nativeCurrencyHash = this.configService.get<string>('COTI_CURRENCY_HASH');
    const tokenTransactionsToNotifyMap = {
      [nativeCurrencyHash]: 1,
    };
    for (const bt of transaction.inputBaseTransactions) {
      if (bt.currencyHash) tokenTransactionsToNotifyMap[bt.currencyHash] = 1;
    }
    for (const bt of transaction.receiverBaseTransactions) {
      if (bt.currencyHash) tokenTransactionsToNotifyMap[bt.currencyHash] = 1;
    }
    for (const bt of transaction.fullnodeFeeBaseTransactions) {
      if (bt.currencyHash) tokenTransactionsToNotifyMap[bt.currencyHash] = 1;
    }
    for (const bt of transaction.networkFeeBaseTransactions) {
      if (bt.currencyHash) tokenTransactionsToNotifyMap[bt.currencyHash] = 1;
    }
    for (const bt of transaction.tokenGenerationFeeBaseTransactions) {
      if (bt.currencyHash) tokenTransactionsToNotifyMap[bt.currencyHash] = 1;
    }
    for (const bt of transaction.tokenMintingFeeBaseTransactions) {
      if (bt.currencyHash) tokenTransactionsToNotifyMap[bt.currencyHash] = 1;
    }

    return Object.keys(tokenTransactionsToNotifyMap);
  }

  async eventHandler(transactionEvents: any[]) {
    const msgPromises = [];
    if (!transactionEvents?.length) return;

    try {
      const transactionIds = transactionEvents.map(x => x.id);
      const transactionEntities = await getTransactionsById(transactionIds);
      const currencySymbolMap = await getTokensSymbols(transactionEntities);
      const allAddressesToNotify = this.getTransactionsAddressesToNotify(transactionEntities);
      const addressTotalTransactionCountMap = await this.getTotalTransactionCountMap(allAddressesToNotify);
      for (const transaction of transactionEntities) {
        const addressesToNotify = this.getTransactionAddressesToNotify(transaction);
        const getTransactionCurrencyHashesToNotify = this.getTransactionCurrencyHashesToNotify(transaction);

        const eventMessage = new TransactionDto(transaction, currencySymbolMap);
        for (const addressToNotify of addressesToNotify) {
          msgPromises.push(this.gateway.sendMessageToRoom(addressToNotify, `${SocketEvents.AddressTransactionsNotification}`, eventMessage));
          msgPromises.push(
            this.gateway.sendMessageToRoom(addressToNotify, `${SocketEvents.AddressTransactionsTotalNotification}`, addressTotalTransactionCountMap[addressToNotify]),
          );
        }
        for (const currencyHash of getTransactionCurrencyHashesToNotify) {
          msgPromises.push(this.gateway.sendMessageToRoom(currencyHash, `${SocketEvents.TokenTransactionsNotification}`, eventMessage));
        }
        msgPromises.push(this.gateway.sendMessageToRoom(transaction.nodeHash, `${SocketEvents.NodeTransactionsNotification}`, eventMessage));
        msgPromises.push(this.gateway.sendMessageToRoom(transaction.hash, `${SocketEvents.TransactionDetails}`, eventMessage));
        msgPromises.push(this.gateway.sendBroadcast(SocketEvents.GeneralTransactionsNotification, eventMessage));
      }

      await Promise.all(msgPromises);
    } catch (error) {
      this.logger.error(`Failed to send to socket: ${error}`);
    }
  }
}
