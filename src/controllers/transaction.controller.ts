import { Body, Controller, Get, Post, Query, UseFilters, UseInterceptors } from '@nestjs/common';
import { ExplorerError } from 'src/errors/explorer-error';
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
  async getTransactions(@Query('limit') limit = 20, @Query('offset') offset = 0): Promise<TransactionsResponseDto> {
    if (limit < 0 || offset < 0) {
      throw new ExplorerError({ message: 'limit and offset cannot be under 0' });
    }
    const transactions = await this.transactionService.getTransactions(limit, offset);
    return transactions;
  }

  @Post()
  async getTransactionByHash(@Body() body: GetTransactionByHashRequestDto): Promise<TransactionResponseDto> {
    const transactions = await this.transactionService.getTransactionByTxHash(body.transactionHash);
    return transactions;
  }

  @Post('addressTransactions')
  async getAddressTransactions(@Query('limit') limit = 0, @Query('offset') offset = 0, @Body() body: GetAddressTransactionsDto): Promise<TransactionsResponseDto> {
    const transactions = await this.transactionService.getTransactions(limit, offset, body.address);
    return transactions;
  }
}
