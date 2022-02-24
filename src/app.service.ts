import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getManager } from 'typeorm';
import { TransactionDto, TransactionResponseDto, TransactionsResponseDto } from './dtos/transaction.dto';
import { DbAppTransaction } from './entities/';
import { exec } from './utils/promise-helper';

@Injectable()
export class AppService {
  private readonly logger = new Logger('AppService');

  constructor(private configService: ConfigService) {}

  async getTransactions(limit = 16, offset = 37, address?: string): Promise<TransactionsResponseDto> {
    const manager = getManager('db_sync');
    const response = { status: 'Success', transactionsData: [] };
    try {
      const [transactionsError, transactions] = await exec(
        address
          ? manager
              .getRepository<DbAppTransaction>('transactions')
              .createQueryBuilder('transactions')
              .leftJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
              .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
              .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
              .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions')
              .limit(limit)
              .offset(offset)
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
              .getMany()
          : manager
              .getRepository<DbAppTransaction>('transactions')
              .createQueryBuilder('transactions')
              .leftJoinAndSelect('transactions.inputBaseTransactions', 'input_base_transactions')
              .leftJoinAndSelect('transactions.receiverBaseTransactions', 'receiver_base_transactions')
              .leftJoinAndSelect('transactions.fullnodeFeeBaseTransactions', 'fullnode_fee_base_transactions')
              .leftJoinAndSelect('transactions.networkFeeBaseTransactions', 'network_fee_base_transactions')
              .limit(limit)
              .offset(offset)
              .getMany(),
      );

      if (transactionsError) {
        this.logger.error(transactionsError);
        throw transactionsError;
      }

      for (const transaction of transactions) {
        const baseTransactions = [
          ...transaction.inputBaseTransactions,
          ...transaction.receiverBaseTransactions,
          ...transaction.fullnodeFeeBaseTransactions,
          ...transaction.networkFeeBaseTransactions,
        ];
        transaction.baseTransactions = baseTransactions;
        response.transactionsData.push(new TransactionDto(transaction));
      }

      return response;
    } catch (error) {
      this.logger.error(error);
      response.status = 'failed';
      return response;
    } finally {
      this.logger.debug(`findAll start current free connections after release ${manager['connection']['driver']['pool']['_freeConnections'].length}`);
    }
  }

  async getTransactionByTxHash(transactionHash: string): Promise<TransactionResponseDto> {
    const manager = getManager('db_sync');
    const response = { status: 'Success', transactionData: null };
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
        this.logger.error(transactionError);
        throw transactionError;
      }

      const baseTransactions = [
        ...transaction.inputBaseTransactions,
        ...transaction.receiverBaseTransactions,
        ...transaction.fullnodeFeeBaseTransactions,
        ...transaction.networkFeeBaseTransactions,
      ];
      transaction.baseTransactions = baseTransactions;
      response.transactionData = new TransactionDto(transaction);

      return response;
    } catch (error) {
      this.logger.error(error);
      response.status = 'failed';
      return response;
    } finally {
      this.logger.debug(`findAll start current free connections after release ${manager['connection']['driver']['pool']['_freeConnections'].length}`);
    }
  }
}
