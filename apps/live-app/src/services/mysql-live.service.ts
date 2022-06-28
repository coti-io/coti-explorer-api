import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import LiveMysql from 'mysql-live-select';
import {
  DbAppTransaction,
  exec,
  getActiveWalletsCount,
  getConfirmationTime,
  getCountActiveAddresses,
  getCurrencyHashCountByCurrencyId,
  getCurrencyIdsByCurrencyHashes,
  getCurrentSupplyUpdate,
  getNativeBalances,
  getTokensSymbols,
  getTotalTgbts,
  getTransactionsById,
  getTransactionsCount,
  getTransactionsCurrencyHashesToNotify,
  getTransactionsQuery,
  TransactionDto,
} from '@app/shared';
import { AppGateway } from '../gateway';
import { TokenService } from '../../../explorer-api/src/services';

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
  NumberOfActiveAddresses = 'numberOfActiveAddresses',
  TreasuryTotalsUpdates = 'treasuryTotalsUpdates',
  Transactions = 'transactions',
  TokenTransactionsTotal = 'tokenTransactionsTotal',
  AddressBalanceUpdate = 'addressBalanceUpdate',
  TokenCirculatingSupplyUpdate = 'tokenCirculatingSupplyUpdate',
  CotiPrice = 'cotiPrice',
  NewTokens = 'newToken',
  Tokens = 'tokens',
  TokensTotal = 'tokensTotal',
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

  constructor(private gateway: AppGateway, private readonly configService: ConfigService, private readonly tokenService: TokenService) {
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
        const event = SocketEvents.TransactionConfirmationUpdate;
        if (!firstRunMap[event]) {
          firstRunMap[event] = true;
          return;
        }
        if (diff.added && diff.added.length > 0) {
          await this.eventHandler(diff.added, event);
        }
      });

    this.liveConnection
      .select(getCountActiveAddresses(), [
        {
          table: `address_balances`,
        },
      ])
      .on('update', async (diff: Diff) => {
        const event = SocketEvents.NumberOfActiveAddresses;
        if (!firstRunMap[event]) {
          firstRunMap[event] = true;
          return;
        }
        if (diff.added && diff.added.length > 0) {
          await this.eventHandler(diff.added, event);
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
        addressToNotifyMap[bt.tokenMintingServiceData.receiverAddress] = 1;
      }
    }
    return Object.keys(addressToNotifyMap);
  }

  async eventHandler(transactionEvents: any[], event: string) {
    const msgPromises = [];
    if (!transactionEvents?.length) return;

    try {
      if (event === SocketEvents.NumberOfActiveAddresses) {
        const activeWallets = await getActiveWalletsCount();
        msgPromises.push(this.gateway.sendMessageToRoom(SocketEvents.NumberOfActiveAddresses, `${SocketEvents.NumberOfActiveAddresses}`, activeWallets));
        return;
      }
      if (event === SocketEvents.TransactionConfirmationUpdate) {
        const lastConfirmationTimes = await getConfirmationTime();
        msgPromises.push(this.gateway.sendMessageToRoom(SocketEvents.TransactionConfirmationUpdate, `${SocketEvents.TransactionConfirmationUpdate}`, lastConfirmationTimes));
      }
      const transactionIds = transactionEvents.map(x => x.id);
      const transactionEntities = await getTransactionsById(transactionIds);
      const circulatingSupplyUpdates = await getCurrentSupplyUpdate(transactionEntities);
      const transactionsCurrencyHashes = getTransactionsCurrencyHashesToNotify(transactionEntities);
      const currencies = await getCurrencyIdsByCurrencyHashes(transactionsCurrencyHashes);
      const currencyIds = currencies.map(currency => currency.id);
      const currenciesCount = await getCurrencyHashCountByCurrencyId(currencyIds);
      const currencySymbolMap = await getTokensSymbols(transactionEntities);
      const allAddressesToNotify = this.getTransactionsAddressesToNotify(transactionEntities);
      const addressesBalanceMap = await getNativeBalances(allAddressesToNotify);
      const addressTotalTransactionCountMap = await this.getTotalTransactionCountMap(allAddressesToNotify);
      const confirmedTokenGenerationTransactionSymbols = transactionEntities
        .filter(tx => tx.tokenGenerationFeeBaseTransactions.length > 0 && tx.transactionConsensusUpdateTime)
        .map(tx => tx.tokenGenerationFeeBaseTransactions[0].tokenGenerationServiceData.originatorCurrencyData.symbol);
      const [tokenResError, tokensInfo] = await exec(this.tokenService.getTokensInfoBySymbol(confirmedTokenGenerationTransactionSymbols));
      if (tokenResError) {
        this.logger.error(tokenResError);
      }
      if (tokensInfo && tokensInfo.length) {
        for (const tokenInfo of tokensInfo) {
          msgPromises.push(this.gateway.sendMessageToRoom(SocketEvents.Tokens, SocketEvents.NewTokens, tokensInfo));
        }
        const [totalTokensError, totalTokens] = await exec(getTotalTgbts());
        if (totalTokensError) {
          this.logger.error(totalTokensError);
        }
        if (totalTokens) msgPromises.push(this.gateway.sendMessageToRoom(SocketEvents.Tokens, SocketEvents.TokensTotal, { count: totalTokens }));
      }
      // build token info for this tokens
      if (circulatingSupplyUpdates.length > 0) {
        for (const cs of circulatingSupplyUpdates) {
          msgPromises.push(this.gateway.sendMessageToRoom(cs.currencyHash, `${SocketEvents.TokenCirculatingSupplyUpdate}`, cs));
        }
      }
      for (const transaction of transactionEntities) {
        const addressesToNotify = this.getTransactionsAddressesToNotify([transaction]);
        const getTransactionCurrencyHashesToNotify = getTransactionsCurrencyHashesToNotify([transaction]);

        const eventMessage = new TransactionDto(transaction, currencySymbolMap);
        for (const addressToNotify of addressesToNotify) {
          msgPromises.push(this.gateway.sendMessageToRoom(addressToNotify, `${SocketEvents.AddressTransactionsNotification}`, eventMessage));
          msgPromises.push(this.gateway.sendMessageToRoom(addressToNotify, `${SocketEvents.AddressBalanceUpdate}`, addressesBalanceMap[addressToNotify]));
          msgPromises.push(
            this.gateway.sendMessageToRoom(addressToNotify, `${SocketEvents.AddressTransactionsTotalNotification}`, addressTotalTransactionCountMap[addressToNotify]),
          );
        }
        for (const currency of currencies) {
          msgPromises.push(this.gateway.sendMessageToRoom(currency.hash, `${SocketEvents.TokenTransactionsTotal}`, currenciesCount[currency.id]));
        }
        for (const currencyHash of getTransactionCurrencyHashesToNotify) {
          msgPromises.push(this.gateway.sendMessageToRoom(currencyHash, `${SocketEvents.TokenTransactionsNotification}`, eventMessage));
        }
        msgPromises.push(this.gateway.sendMessageToRoom(transaction.nodeHash, `${SocketEvents.NodeTransactionsNotification}`, eventMessage));
        msgPromises.push(this.gateway.sendMessageToRoom(transaction.hash, `${SocketEvents.TransactionDetails}`, eventMessage));
        msgPromises.push(this.gateway.sendMessageToRoom(SocketEvents.GeneralTransactionsNotification, `${SocketEvents.GeneralTransactionsNotification}`, eventMessage));
      }

      Promise.all(msgPromises).catch(err => {
        this.logger.error(err);
      });
    } catch (error) {
      this.logger.error(`Failed to send to socket: ${error}`);
    }
  }
}
