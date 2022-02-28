import { Injectable, Logger } from '@nestjs/common';
import { ExplorerError } from 'src/errors/explorer-error';
import { HttpCodes, Status } from 'src/utils/http-constants';
import { getManager } from 'typeorm';
import { TransactionDto, TransactionResponseDto, TransactionsResponseDto } from '../dtos/transaction.dto';
import { DbAppTransaction } from '../entities/';
import { exec } from '../utils/promise-helper';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger('TransactionService');

  constructor() {}

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
        : query;
      const [transactionsError, transactions] = await exec(query.getMany());

      if (transactionsError) {
        throw transactionsError;
      }
      const parsedTransactions = transactions.map(tx => new TransactionDto(tx));

      return {
        transactionsData: parsedTransactions,
      };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError({
        message: error.message,
      });
    } finally {
      this.logger.debug(`findAll start current free connections after release ${manager['connection']['driver']['pool']['_freeConnections'].length}`);
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
    } finally {
      this.logger.debug(`findAll start current free connections after release ${manager['connection']['driver']['pool']['_freeConnections'].length}`);
    }
  }
}
