import { Controller, HttpCode, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { CotiPriceResponseDto, TransactionConfirmationTimeResponseDto, TreasuryTotalsResponseDto, WalletCountResponseDto } from '@app/shared';
import { ExplorerExceptionFilter } from '../filters';
import { ResponseInterceptor } from '../interceptors';
import { TransactionService, WalletService } from '../services';
import { ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';

@ApiTags('Statistics')
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
    return this.transactionService.getTransactionsConfirmationTime();
  }

  @Post('treasury-totals')
  @HttpCode(200)
  async getTreasuryTotals(): Promise<TreasuryTotalsResponseDto> {
    return this.transactionService.getTreasuryTotals();
  }

  @Post('coti-price')
  @HttpCode(200)
  async getCotiPrice(): Promise<CotiPriceResponseDto> {
    return this.transactionService.getCotiPrice();
  }
}
