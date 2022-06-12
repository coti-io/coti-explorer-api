import { Injectable, Logger } from '@nestjs/common';
import { DbAppTransaction, exec, WalletCountResponseDto } from '@app/shared';

import { ExplorerError } from '../errors';
import { getManager } from 'typeorm';

@Injectable()
export class WalletService {
  private readonly logger = new Logger('WalletService');

  async getNumberOfWallets(): Promise<WalletCountResponseDto> {
    const manager = getManager('db_app');
    try {
      const query = manager.getRepository<DbAppTransaction>('transactions').createQueryBuilder('transactions').select('COUNT(DISTINCT transactions.senderHash) walletCount');
      const [numberOfWalletsError, numberOfWallets] = await exec(query.getRawOne<WalletCountResponseDto>());

      if (numberOfWalletsError) {
        throw numberOfWalletsError;
      }
      return numberOfWallets;
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError({
        message: error.message,
      });
    }
  }
}
