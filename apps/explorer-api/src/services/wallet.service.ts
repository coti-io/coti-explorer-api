import { Injectable, Logger } from '@nestjs/common';
import { exec, getActiveWalletsCount, WalletCountResponseDto } from '@app/shared';

import { ExplorerError } from '../errors';

@Injectable()
export class WalletService {
  private readonly logger = new Logger('WalletService');

  async getNumberOfWallets(): Promise<WalletCountResponseDto> {
    try {
      const [activeWalletsError, activeWallets] = await exec(getActiveWalletsCount());
      if (activeWalletsError) {
        throw activeWalletsError;
      }
      return { walletCount: activeWallets };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError({
        message: error.message,
      });
    }
  }
}
