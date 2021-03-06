import { Injectable, Logger } from '@nestjs/common';

import { ExplorerBadRequestError, ExplorerError } from '../errors/explorer-error';
import { getManager, Not } from 'typeorm';
import {
  Addresses,
  AddressesTransactionsResponseDto,
  ConfirmationTimeEntity,
  CotiPriceResponseDto,
  Currency,
  DbAppEntitiesNames,
  DbAppTransaction,
  exec,
  ExplorerAppEntitiesNames,
  getNativeBalance,
  getTokenBalances,
  getTokensSymbols,
  getTransactionCount,
  getTransactionCurrenciesCount,
  getTransactionsById,
  NodeTransactionsResponseDto,
  TransactionAddress,
  TransactionConfirmationTimeResponseDto,
  TransactionCurrency,
  TransactionDto,
  TransactionRequestDto,
  TransactionResponseDto,
  TransactionsResponseDto,
  TransactionType,
  TreasuryTotalsEntity,
  TreasuryTotalsResponseDto,
} from '@app/shared';
import { ConfigService } from '@nestjs/config';
import { utils as CryptoUtils } from '@coti-io/crypto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger('TransactionService');
  private readonly treasuryUrl: string;
  private readonly totalTransactionsCount: number;

  constructor(private readonly configService: ConfigService, private httpService: HttpService) {
    this.treasuryUrl = this.configService.get<string>('TREASURY_URL');
    this.totalTransactionsCount = 200;
  }

  async getTransactions(body: TransactionRequestDto): Promise<TransactionsResponseDto> {
    const manager = getManager('db_app');
    const { limit, offset } = body;
    try {
      if (limit + offset > 200) throw new ExplorerBadRequestError('Allow only 200 transactions back');

      const idsQuery = manager
        .getRepository<DbAppTransaction>(DbAppEntitiesNames.transactions)
        .createQueryBuilder('t')
        .select('id')
        .where({ type: Not(TransactionType.ZEROSPEND) })
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);
      const [transactionsIdsError, transactionsIds] = await exec(idsQuery.getRawMany<{ id: number }>());

      if (transactionsIdsError) {
        throw transactionsIdsError;
      }

      const ids = transactionsIds.map(t => t.id);
      const [transactionsError, transactions] = await exec(getTransactionsById(ids));

      if (transactionsError) {
        throw transactionsError;
      }
      const currencySymbolMap = await getTokensSymbols(transactions);
      return new TransactionsResponseDto(this.totalTransactionsCount, transactions, currencySymbolMap);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTransactionsByAddress(limit: number, offset: number, address: string): Promise<AddressesTransactionsResponseDto> {
    const promisesArr = [];
    const manager = getManager('db_app');
    try {
      const [dbAddressError, dbAddress] = await exec(
        manager.getRepository<Addresses>('addresses').createQueryBuilder('a').where('a.addressHash = :address', { address }).getOneOrFail(),
      );
      if (dbAddressError) {
        throw new ExplorerError({ message: `Could not find address ${address}` });
      }
      const addressId = dbAddress.id;
      const transactionAddressesQuery = manager
        .getRepository<TransactionAddress>('transaction_addresses')
        .createQueryBuilder('t')
        .where('t.addressId = :addressId', { addressId })
        .orderBy('t.attachmentTime', 'DESC')
        .limit(limit)
        .offset(offset);

      const [transactionsAddressesError, transactionsAddresses] = await exec(transactionAddressesQuery.getMany());

      if (transactionsAddressesError) {
        throw transactionsAddressesError;
      }
      const transactionIds = transactionsAddresses.map(ta => ta.transactionId);
      const [transactionsError, transactions] = await exec(getTransactionsById(transactionIds));

      if (transactionsError) {
        throw transactionsError;
      }

      const [totalTransactionsError, totalTransactions] = await exec(getTransactionCount(address));
      if (totalTransactionsError) {
        throw totalTransactionsError;
      }

      promisesArr.push(getTokensSymbols(transactions));
      promisesArr.push(getTokenBalances(address));
      promisesArr.push(getNativeBalance(address));

      const results: PromiseSettledResult<PromiseFulfilledResult<any> | PromiseRejectedResult>[] = await Promise.allSettled(promisesArr);
      const successResults = results.filter(promise => promise.status === 'fulfilled') as PromiseFulfilledResult<any>[];

      if (successResults.length != results.length) {
        throw results.find(pVal => pVal.status === 'rejected');
      }

      return new AddressesTransactionsResponseDto(totalTransactions, transactions, successResults[0].value, successResults[1].value, successResults[2].value.nativeBalance);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTransactionByTxHash(transactionHash: string): Promise<TransactionResponseDto> {
    const manager = getManager('db_app');
    try {
      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('transactions')
        .leftJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
        .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
        .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
        .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions')
        .leftJoinAndSelect('transactions.tokenMintingFeeBaseTransactions', 'tmbt')
        .leftJoinAndSelect('transactions.tokenGenerationFeeBaseTransactions', 'tgbt')
        .leftJoinAndSelect('tmbt.tokenMintingServiceData', 'tmsd')
        .leftJoinAndSelect('tgbt.tokenGenerationServiceData', 'tgsd')
        .leftJoinAndSelect('tgsd.originatorCurrencyData', 'ocd')
        .leftJoinAndSelect('tgsd.currencyTypeData', 'ctd')
        .where('transactions.hash=:transactionHash', { transactionHash });
      const [transactionError, transaction] = await exec(query.getOneOrFail());

      if (transactionError) {
        throw transactionError;
      }

      const currencySymbolMap = await getTokensSymbols([transaction]);

      return {
        transactionData: new TransactionDto(transaction, currencySymbolMap),
      };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTransactionByNodeHash(limit: number, offset: number, nodeHash: string): Promise<NodeTransactionsResponseDto> {
    const manager = getManager('db_app');
    try {
      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.inputBaseTransactions', 'ibt')
        .leftJoinAndSelect('t.receiverBaseTransactions', 'rbt')
        .leftJoinAndSelect('t.fullnodeFeeBaseTransactions', 'ffbt')
        .leftJoinAndSelect('t.networkFeeBaseTransactions', 'nfbt')
        .leftJoinAndSelect('t.tokenMintingFeeBaseTransactions', 'tmbt')
        .leftJoinAndSelect('t.tokenGenerationFeeBaseTransactions', 'tgbt')
        .leftJoinAndSelect('tmbt.tokenMintingServiceData', 'tmsd')
        .leftJoinAndSelect('tgbt.tokenGenerationServiceData', 'tgsd')
        .leftJoinAndSelect('tgsd.originatorCurrencyData', 'ocd')
        .leftJoinAndSelect('tgsd.currencyTypeData', 'ctd')
        .where('t.nodeHash=:nodeHash', { nodeHash })
        .andWhere({ type: Not(TransactionType.ZEROSPEND) })
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);
      const [transactionsError, transactions] = await exec(query.getMany());

      if (transactionsError) {
        throw transactionsError;
      }

      const currencySymbolMap = await getTokensSymbols(transactions);
      return new NodeTransactionsResponseDto(transactions, currencySymbolMap);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTransactionByCurrencyHash(limit: number, offset: number, currencyHash: string): Promise<TransactionsResponseDto> {
    const manager = getManager('db_app');
    const promiseArr = [];
    const cotiCurrencyHash = CryptoUtils.getCurrencyHashBySymbol('coti');
    try {
      if (currencyHash === cotiCurrencyHash) {
        throw new ExplorerBadRequestError(`Currency with currency hash ${currencyHash} is not supported`);
      }
      const [dbCurrencyError, dbCurrency] = await exec(
        manager.getRepository<Currency>(DbAppEntitiesNames.currencies).createQueryBuilder('c').where('c.hash = :currencyHash', { currencyHash }).getOneOrFail(),
      );
      if (dbCurrencyError) {
        throw new ExplorerError({ message: `Could not find currency with currency hash ${currencyHash}` });
      }
      const currencyId = dbCurrency.id;
      const transactionCurrenciesQuery = manager
        .getRepository<TransactionCurrency>(DbAppEntitiesNames.transactionsCurrencies)
        .createQueryBuilder('t')
        .where('t.currencyId = :currencyId', { currencyId })
        .orderBy('t.attachmentTime', 'DESC')
        .limit(limit)
        .offset(offset);

      const [transactionsCurrenciesError, transactionsCurrencies] = await exec(transactionCurrenciesQuery.getMany());

      if (transactionsCurrenciesError) {
        throw transactionsCurrenciesError;
      }
      const transactionIds = transactionsCurrencies.map(ta => ta.transactionId);
      const [transactionsError, transactions] = await exec(getTransactionsById(transactionIds));

      if (transactionsError) {
        throw transactionsError;
      }

      promiseArr.push(getTransactionCurrenciesCount(currencyId));
      promiseArr.push(getTokensSymbols(transactions));
      const results: PromiseSettledResult<PromiseFulfilledResult<any> | PromiseRejectedResult>[] = await Promise.allSettled(promiseArr);
      const successResults = results.filter(promise => promise.status === 'fulfilled') as PromiseFulfilledResult<any>[];

      if (successResults.length != results.length) {
        throw results.find(pVal => pVal.status === 'rejected');
      }

      return new TransactionsResponseDto(successResults[0].value, transactions, successResults[1].value);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTransactionsConfirmationTime(): Promise<TransactionConfirmationTimeResponseDto> {
    const manager = getManager();
    try {
      const [lastConfirmationError, lastConfirmation] = await exec(
        manager.getRepository<ConfirmationTimeEntity>(ExplorerAppEntitiesNames.confirmationTimes).createQueryBuilder().orderBy({ id: 'DESC' }).getOneOrFail(),
      );

      if (lastConfirmationError) throw lastConfirmationError;

      return {
        average: lastConfirmation.average,
        minimum: lastConfirmation.minimum,
        maximum: lastConfirmation.maximum,
      };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTreasuryTotals(): Promise<TreasuryTotalsResponseDto> {
    const manager = getManager();
    try {
      const [lastTotalsError, lastTotals] = await exec(
        manager.getRepository<TreasuryTotalsEntity>(ExplorerAppEntitiesNames.treasuryTotals).createQueryBuilder().orderBy({ id: 'DESC' }).getOneOrFail(),
      );

      if (lastTotalsError) throw lastTotalsError;

      return {
        totalCotiInPool: lastTotals.totalCotiInPool,
        totalUnlocked: lastTotals.totalUnlocked,
        totalUnlockedUsd: lastTotals.totalUnlockedUsd,
        totalLevragedCoti: lastTotals.totalLevragedCoti,
        tvl: lastTotals.tvl,
        maxApy: lastTotals.maxApy,
      };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getCotiPrice(): Promise<CotiPriceResponseDto> {
    const [getCotiPriceError, getCotiPrice] = await exec(firstValueFrom(this.httpService.get(`${this.treasuryUrl}/get-coti-price`)));
    if (getCotiPriceError) throw getCotiPriceError;

    return getCotiPrice.data;
  }
}
