import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { GetAddressTransactionsDto, GetTransactionByHashRequestDto, TransactionResponseDto, TransactionsResponseDto } from './dtos/transaction.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('transaction/lastTransactions')
  async getTransactions(@Query('limit') limit?: number, @Query('offset') offset?: number): Promise<TransactionsResponseDto> {
    const transactions = await this.appService.getTransactions(limit, offset);
    return transactions;
  }

  @Post('transaction')
  async getTransactionByHash(@Body() body: GetTransactionByHashRequestDto): Promise<TransactionResponseDto> {
    const transactions = await this.appService.getTransactionByTxHash(body.transactionHash);
    return transactions;
  }

  @Post('transaction/addressTransactions')
  async getAddressTransactions(@Body() body: GetAddressTransactionsDto): Promise<TransactionsResponseDto> {
    const transactions = await this.appService.getTransactions(body.limit, body.offset, body.address);
    return transactions;
  }
}
