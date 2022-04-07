import { Injectable, Logger } from '@nestjs/common';
import { TransactionConfirmationTimeResponseDto } from 'src/dtos';

import { ExplorerBadRequestError, ExplorerError } from 'src/errors/explorer-error';
import { getManager, In } from 'typeorm';
import { TransactionDto, TransactionResponseDto, TransactionsResponseDto } from '../dtos/transaction.dto';
import { Addresses, DbAppTransaction, getTransactionCount, TransactionAddress } from '../entities/db-app';
import { exec } from '../utils/promise-helper';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger('TransactionService');
  constructor(private readonly configService: ConfigService) {}

  async getTransactions(limit: number, offset: number): Promise<TransactionsResponseDto> {
    const manager = getManager('db_app');
    try {
      const idsQuery = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('transactions')
        .select('id')
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);
      const [transactionsIdsError, transactionsIds] = await exec(idsQuery.getRawMany<{ id: number }>());

      if (transactionsIdsError) {
        throw transactionsIdsError;
      }
      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('transactions')
        .leftJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
        .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
        .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
        .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions')
        .where({ id: In(transactionsIds.map(t => t.id)) })
        .orderBy({ attachmentTime: 'DESC' });
      const [transactionsError, transactions] = await exec(query.getMany());

      if (transactionsError) {
        throw transactionsError;
      }
      return new TransactionsResponseDto(transactions.length, transactions);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTransactionsByAddress(limit: number, offset: number, address: string): Promise<TransactionsResponseDto> {
    const manager = getManager('db_app');
    try {
      const [dbAddressError, dbAddress] = await exec(
        manager.getRepository<Addresses>('addresses').createQueryBuilder('a').where('a.addressHash = :address', { address }).getOneOrFail(),
      );
      if (dbAddressError) {
        throw dbAddressError;
      }
      const addressId = dbAddress.id;
      const transactionAddressesQuery = manager
        .getRepository<TransactionAddress>('transaction_addresses')
        .createQueryBuilder('t')
        .where('t.addressId = :addressId', { addressId })
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);

      const [transactionsAddressesError, transactionsAddresses] = await exec(transactionAddressesQuery.getMany());

      if (transactionsAddressesError) {
        throw transactionsAddressesError;
      }
      const transactionIds = transactionsAddresses.map(ta => ta.transactionId);
      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('transactions')
        .innerJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
        .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
        .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
        .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions')
        .where(`transactions.id IN(${transactionIds.join(',')})`)
        .orderBy({ attachmentTime: 'DESC' });
      const [transactionsError, transactions] = await exec(query.getMany());

      if (transactionsError) {
        throw transactionsError;
      }

      const [totalTransactionsError, totalTransactions] = await exec(getTransactionCount(address));
      if (totalTransactionsError) {
        throw totalTransactionsError;
      }

      return new TransactionsResponseDto(totalTransactions, transactions);
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
        .where('transactions.hash=:transactionHash', { transactionHash });
      const [transactionError, transaction] = await exec(query.getOneOrFail());

      if (transactionError) {
        throw transactionError;
      }

      return {
        transactionData: new TransactionDto(transaction),
      };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTransactionByNodeHash(limit: number, offset: number, nodeHash: string): Promise<TransactionsResponseDto> {
    const manager = getManager('db_app');
    try {
      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.inputBaseTransactions', 'ibt')
        .leftJoinAndSelect('t.receiverBaseTransactions', 'rbt')
        .leftJoinAndSelect('t.fullnodeFeeBaseTransactions', 'ffbt')
        .leftJoinAndSelect('t.networkFeeBaseTransactions', 'nfbt')
        .where('t.nodeHash=:nodeHash', { nodeHash })
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);
      const [transactionsError, transactions] = await exec(query.getMany());

      if (transactionsError) {
        throw transactionsError;
      }

      const countQuery = manager.getRepository<DbAppTransaction>('transactions').createQueryBuilder('t').select('COUNT(t.id) as count').where('t.nodeHash=:nodeHash', { nodeHash });

      const [countError, countResponse] = await exec(countQuery.getRawOne<{ count: number }>());

      if (countError) {
        throw countError;
      }

      return new TransactionsResponseDto(countResponse.count, transactions);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTransactionByCurrencyHash(limit: number, offset: number, currencyHash: string): Promise<TransactionsResponseDto> {
    const manager = getManager('db_app');
    try {
      if (currencyHash === this.configService.get('COTI_CURRENCY_HASH')) {
        throw new ExplorerBadRequestError(`Currency with currency hash ${currencyHash} is not supported`);
      }
      const queryTxIds = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('t')
        .innerJoinAndSelect('t.receiverBaseTransactions', 'rbt', `rbt.currencyHash = :currencyHash`, { currencyHash })
        .select('t.id id')
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);
      const [transactionsIdsError, transactionsIds] = await exec(queryTxIds.getRawMany<{ id: number }>());

      if (transactionsIdsError) {
        throw transactionsIdsError;
      }

      const ids = transactionsIds.map(tx => tx.id);

      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.inputBaseTransactions', 'ibt')
        .leftJoinAndSelect('t.receiverBaseTransactions', 'rbt')
        .leftJoinAndSelect('t.fullnodeFeeBaseTransactions', 'ffbt')
        .leftJoinAndSelect('t.networkFeeBaseTransactions', 'nfbt')
        .where({ id: In(ids) })
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);
      const [transactionsError, transactions] = await exec(query.getMany());

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

      return new TransactionsResponseDto(countResponse.count, transactions);
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
