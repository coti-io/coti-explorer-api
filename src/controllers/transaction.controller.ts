import { Body, Controller, Get, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { ExplorerExceptionFilter } from 'src/filters/http-exception.filter';
import { TransactionInterceptor } from 'src/interceptors/transaction.interceptor';
import { TransactionService } from 'src/services';
import { GetAddressTransactionsDto, GetTransactionByHashRequestDto, TransactionResponseDto, TransactionsResponseDto } from '../dtos/transaction.dto';

@UseInterceptors(TransactionInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('lastTransactions')
  async getTransactions(): Promise<TransactionsResponseDto> {
    const transactions = await this.transactionService.getTransactions(20, 0);
    return transactions;
  }

  @Post()
  async getTransactionByHash(@Body() body: GetTransactionByHashRequestDto): Promise<TransactionResponseDto> {
    const transactions = await this.transactionService.getTransactionByTxHash(body.transactionHash);
    return transactions;
  }

  @Post('addressTransactions')
  async getAddressTransactions(@Body() body: GetAddressTransactionsDto): Promise<TransactionsResponseDto> {
    const transactions = await this.transactionService.getTransactionsByAddress(body.limit, body.offset, body.address);
    return transactions;
  }
}
