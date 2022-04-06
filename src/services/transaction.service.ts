import { Injectable, Logger } from '@nestjs/common';
import { Addresses } from 'src/entities/addresses.entity';
import { ExplorerError } from 'src/errors/explorer-error';
import { getManager, In } from 'typeorm';
import { TransactionDto, TransactionResponseDto, TransactionsResponseDto } from '../dtos/transaction.dto';
import { DbAppTransaction, getTransactionCount, TransactionAddress } from '../entities/';
import { exec } from '../utils/promise-helper';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger('TransactionService');

  async getTransactions(limit: number, offset: number): Promise<TransactionsResponseDto> {
    const manager = getManager('db_sync');
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
    const manager = getManager('db_sync');
    try {
      const [dbAddressError, dbAddress] = await exec(
        manager.getRepository<Addresses>('addresses').createQueryBuilder('a').where('a.addressHash = :address', { address }).getOneOrFail(),
      );
      if (dbAddressError) {
        throw dbAddressError;
      }
      const addressId = dbAddress.id;
      const transacitonAddressesQuery = manager
        .getRepository<TransactionAddress>('transaction_addresses')
        .createQueryBuilder('t')
        .where('t.addressId = :addressId', { addressId })
        .orderBy({ attachmentTime: 'DESC' })
        .limit(limit)
        .offset(offset);

      const [transactionsAddressesError, transactionsAddresses] = await exec(transacitonAddressesQuery.getMany());

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
    const manager = getManager('db_sync');
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
}
