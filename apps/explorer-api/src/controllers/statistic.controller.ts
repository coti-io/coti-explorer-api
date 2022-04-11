import { Controller, HttpCode, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { TransactionConfirmationTimeResponseDto, WalletCountResponseDto } from '@app/shared';
import { ExplorerExceptionFilter } from '../filters';
import { ResponseInterceptor } from '../interceptors';
import { TransactionService, WalletService } from '../services';

@UseInterceptors(ResponseInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('statistic')
export class StatisticController {
  constructor(private readonly walletService: WalletService, private readonly transactionService: TransactionService) {}

  @Post('count')
  @HttpCode(200)
  async getWalletCount(): Promise<WalletCountResponseDto> {
    return this.walletService.getNumberOfWallets();
  }

  @Post('transaction-confirmation-time')
  @HttpCode(200)
  async getTransactionConfirmationTime(): Promise<TransactionConfirmationTimeResponseDto> {
    return this.transactionService.getConfirmationTime();
  }
}
