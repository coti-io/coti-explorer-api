import { Injectable, Logger } from '@nestjs/common';

import { ExplorerBadRequestError, ExplorerError } from '../errors/explorer-error';
import { getManager, Not } from 'typeorm';
import {
  Addresses,
  AddressesTransactionsResponseDto,
  ConfirmationTimeEntity,
  DbAppEntitiesNames,
  DbAppTransaction,
  exec,
  ExplorerAppEntitiesNames,
  getNativeBalance,
  getTokenBalances,
  getTokensSymbols,
  getTransactionCount,
  getTransactionsById,
  NodeTransactionsResponseDto,
  TransactionAddress,
  TransactionConfirmationTimeResponseDto,
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

@Injectable()
export class TransactionService {
  private readonly logger = new Logger('TransactionService');

  constructor(private readonly configService: ConfigService) {}

  async getTransactions(body: TransactionRequestDto): Promise<TransactionsResponseDto> {
    const manager = getManager('db_app');
    const { limit, offset } = body;
    let transactionsIdFinal;
    try {
      const idsQuery = manager
        .getRepository<DbAppTransaction>(DbAppEntitiesNames.transactions)
        .createQueryBuilder('t')
        .select('id')
        .where({ type: Not(TransactionType.ZEROSPEND) })
        .andWhere('t.createTime >= now() - INTERVAL 1 DAY')
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);
      const [transactionsIdsError, transactionsIds] = await exec(idsQuery.getRawMany<{ id: number }>());

      if (transactionsIdsError) {
        throw transactionsIdsError;
      }

      if ((transactionsIds.length < limit || 50) && (!offset || offset === 0)) {
        const idsQuery = manager
          .getRepository<DbAppTransaction>(DbAppEntitiesNames.transactions)
          .createQueryBuilder('t')
          .select('id')
          .where({ type: Not(TransactionType.ZEROSPEND) })
          .orderBy({ attachmentTime: 'DESC' })
          .limit(limit)
          .offset(offset);
        const [transactionsIdsDefaultError, transactionsIdsDefault] = await exec(idsQuery.getRawMany<{ id: number }>());

        if (transactionsIdsDefaultError) {
          throw transactionsIdsDefaultError;
        }
        transactionsIdFinal = transactionsIdsDefault;
      } else {
        transactionsIdFinal = transactionsIds;
      }

      const ids = transactionsIdFinal.map(t => t.id);
      const [transactionsError, transactions] = await exec(getTransactionsById(ids));

      if (transactionsError) {
        throw transactionsError;
      }
      const currencySymbolMap = await getTokensSymbols(transactions);
      return new TransactionsResponseDto(transactions.length, transactions, currencySymbolMap);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTransactionsByAddress(limit: number, offset: number, address: string): Promise<AddressesTransactionsResponseDto> {
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
        .leftJoinAndSelect('t.transaction', 'tx', `tx.type <> '${TransactionType.ZEROSPEND}'`)
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
      const currencySymbolMap = await getTokensSymbols(transactions);
      const tokenBalance = await getTokenBalances(address);
      const { nativeBalance } = await getNativeBalance(address);

      return new AddressesTransactionsResponseDto(totalTransactions, transactions, currencySymbolMap, tokenBalance, nativeBalance);
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
    const cotiCurrencyHash = CryptoUtils.getCurrencyHashBySymbol('coti');
    try {
      if (currencyHash === cotiCurrencyHash) {
        throw new ExplorerBadRequestError(`Currency with currency hash ${currencyHash} is not supported`);
      }
      const queryTxIds = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('t')
        .innerJoinAndSelect('t.receiverBaseTransactions', 'rbt', `rbt.currencyHash = :currencyHash`, { currencyHash })
        .select('t.id id')
        .andWhere({ type: Not(TransactionType.ZEROSPEND) })
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);
      const [transactionsIdsError, transactionsIds] = await exec(queryTxIds.getRawMany<{ id: number }>());

      if (transactionsIdsError) {
        throw transactionsIdsError;
      }

      const ids = transactionsIds.map(tx => tx.id);
      const [transactionsError, transactions] = await exec(getTransactionsById(ids));

      if (transactionsError) {
        throw transactionsError;
      }

      const countQuery = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('t')
        .select('COUNT(DISTINCT t.id) as count')
        .innerJoin('t.receiverBaseTransactions', 'rbt', `rbt.currencyHash = :currencyHash`, { currencyHash });

      const [countError, countResponse] = await exec(countQuery.getRawOne<{ count: number }>());

      if (countError) {
        throw countError;
      }
      const currencySymbolMap = await getTokensSymbols(transactions);
      return new TransactionsResponseDto(countResponse.count, transactions, currencySymbolMap);
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
        avg: lastConfirmation.average,
        min: lastConfirmation.minimum,
        max: lastConfirmation.maximum,
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

  async getConfirmationTime(): Promise<TransactionConfirmationTimeResponseDto> {
    const manager = getManager('db_app');
    try {
      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('t')
        .select(
          `
      AVG(t.transactionConsensusUpdateTime - t.attachmentTime)/1000 avg, 
      MIN(t.transactionConsensusUpdateTime - t.attachmentTime)/1000 min,
      MAX(t.transactionConsensusUpdateTime - t.attachmentTime)/1000 max`,
        )
        .where(`t.type <> 'ZeroSpend' AND t.transactionConsensusUpdateTime IS NOT NULL AND t.updateTime > DATE_ADD(NOW(), INTERVAL -24 HOUR)`);
      const [confirmationStatisticError, confirmationStatistic] = await exec(query.getRawOne<TransactionConfirmationTimeResponseDto>());

      if (confirmationStatisticError) {
        throw confirmationStatisticError;
      }
      return confirmationStatistic;
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }
}
