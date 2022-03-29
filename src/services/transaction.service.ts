import { Injectable, Logger } from '@nestjs/common';
import { TransactionConfirmationTimeResponseDto } from 'src/dtos';

import { ExplorerError } from 'src/errors/explorer-error';
import { getManager, In } from 'typeorm';
import { TransactionDto, TransactionResponseDto, TransactionsResponseDto } from '../dtos/transaction.dto';
import { Addresses, DbAppTransaction, getTransactionCount, TransactionAddress } from '../entities/';
import { exec } from '../utils/promise-helper';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger('TransactionService');

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
      throw new ExplorerError({
        message: error.message,
      });
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
      throw new ExplorerError({
        message: error.message,
      });
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
      throw new ExplorerError({
        message: error.message,
      });
    }
  }

  async getTransactionByNodeHash(limit: number, offset: number, nodeHash: string): Promise<TransactionsResponseDto> {
    const manager = getManager('db_app');
    try {
      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('transactions')
        .leftJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
        .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
        .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
        .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions')
        .where('transactions.nodeHash=:nodeHash', { nodeHash })
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);
      const [transactionsError, transactions] = await exec(query.getMany());

      if (transactionsError) {
        throw transactionsError;
      }

      const countQuery = manager
        .getRepository<{ count: number }>('transactions')
        .createQueryBuilder('transactions')
        .select('COUNT(DISTINCT *) as count')
        .where('transactions.nodeHash=:nodeHash', { nodeHash });

      const [countError, countResponse] = await exec(countQuery.getOne());

      if (countError) {
        throw countError;
      }

      return new TransactionsResponseDto(countResponse.count, transactions);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError({
        message: error.message,
      });
    }
  }

  async getConfirmationTime(): Promise<TransactionConfirmationTimeResponseDto> {
    const manager = getManager('db_app');
    try {
      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('transactions')
        .select(
          `
      AVG(transactions.transactionConsensusUpdateTime - transactions.attachmentTime)/1000 avg, 
      MIN(transactions.transactionConsensusUpdateTime - transactions.attachmentTime)/1000 min,
      MAX(transactions.transactionConsensusUpdateTime - transactions.attachmentTime)/1000 max`,
        )
        .where(`transactions.type <> 'ZeroSpend' AND transactions.transactionConsensusUpdateTime IS NOT NULL AND transactions.updateTime > DATE_ADD(NOW(), INTERVAL -24 HOUR)`);
      const [confirmationStatisticError, confirmationStatistic] = await exec(query.getRawOne<TransactionConfirmationTimeResponseDto>());

      if (confirmationStatisticError) {
        throw confirmationStatisticError;
      }
      return confirmationStatistic;
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError({
        message: error.message,
      });
    }
  }
}
