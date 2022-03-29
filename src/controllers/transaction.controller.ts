import { Body, Controller, Get, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { ExplorerExceptionFilter } from 'src/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/interceptors/response.interceptor';
import { TransactionService } from 'src/services';
import { GetAddressTransactionsDto, GetNodeTransactionsDto, GetTransactionByHashRequestDto, TransactionResponseDto, TransactionsResponseDto } from '../dtos';

@UseInterceptors(ResponseInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('last-transactions')
  async getTransactions(): Promise<TransactionsResponseDto> {
    const transactions = await this.transactionService.getTransactions(20, 0);
    return transactions;
  }

  @Post()
  async getTransactionByHash(@Body() body: GetTransactionByHashRequestDto): Promise<TransactionResponseDto> {
    const transactions = await this.transactionService.getTransactionByTxHash(body.transactionHash);
    return transactions;
  }

  @Post('address-transactions')
  async getAddressTransactions(@Body() body: GetAddressTransactionsDto): Promise<TransactionsResponseDto> {
    const transactions = await this.transactionService.getTransactionsByAddress(body.limit, body.offset, body.address);
    return transactions;
  }

  @Post('node-ransactions')
  async getNodeTransactions(@Body() body: GetNodeTransactionsDto): Promise<TransactionsResponseDto> {
    const transactions = await this.transactionService.getTransactionByNodeHash(body.limit, body.offset, body.address);
    return transactions;
  }
}
