import { Controller, HttpCode, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { TransactionConfirmationTimeResponseDto, WalletCountResponseDto } from 'src/dtos';
import { ExplorerExceptionFilter } from 'src/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/interceptors/response.interceptor';
import { TransactionService } from 'src/services';
import { WalletService } from 'src/services/wallet.service';

@UseInterceptors(ResponseInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('statistic')
export class StatisticController {
  constructor(private readonly walletService: WalletService, private readonly transactionService: TransactionService) {}

  @Post('count')
  @HttpCode(200)
  async getWalletCount(): Promise<WalletCountResponseDto> {
    return await this.walletService.getNumberOfWallets();
  }

  @Post('transaction-confirmation-time')
  @HttpCode(200)
  async getTransactionConfirmationTime(): Promise<TransactionConfirmationTimeResponseDto> {
    return await this.transactionService.getConfirmationTime();
  }
}
