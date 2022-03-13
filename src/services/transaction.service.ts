import { Injectable, Logger } from '@nestjs/common';
import { ExplorerError } from 'src/errors/explorer-error';
import { getManager } from 'typeorm';
import { TransactionDto, TransactionResponseDto, TransactionsResponseDto } from '../dtos/transaction.dto';
import { DbAppTransaction } from '../entities/';
import { exec } from '../utils/promise-helper';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger('TransactionService');

  async getTransactions(limit: number, offset: number, address?: string): Promise<TransactionsResponseDto> {
    const manager = getManager('db_sync');
    try {
      let query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('transactions')
        .leftJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
        .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
        .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
        .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions')
        .limit(limit)
        .offset(offset);

      query = address
        ? query
            .where('receiver_base_transactions.addressHash=:address', {
              address,
            })
            .orWhere('input_base_transactions.addressHash=:address', {
              address,
            })
            .orWhere('fullnode_fee_base_transactions.addressHash=:address', {
              address,
            })
            .orWhere('network_fee_base_transactions.addressHash=:address', {
              address,
            })
        : query;

      const [transactionsError, transactionsNcount] = await exec(query.orderBy({ attachmentTime: 'DESC' }).getManyAndCount());
      if (transactionsError) {
        throw transactionsError;
      }
      const [transactionEntities, totalTransactions] = transactionsNcount;
      return new TransactionsResponseDto(totalTransactions, transactionEntities);
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
      const [transactionError, transaction] = await exec(
        manager
          .getRepository<DbAppTransaction>('transactions')
          .createQueryBuilder('transactions')
          .leftJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
          .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
          .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
          .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions')
          .where({ hash: transactionHash })
          .getOne(),
      );

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
