import { Body, Controller, Get, HttpCode, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { ExplorerExceptionFilter } from '../filters';
import { ResponseInterceptor } from '../interceptors';
import { TransactionService } from '../services';
import {
  AddressesTransactionsResponseDto,
  GetAddressTransactionsDto,
  GetNodeTransactionsDto,
  GetTokenTransactionsDto,
  GetTransactionByHashRequestDto,
  NodeTransactionsResponseDto,
  TransactionResponseDto,
  TransactionsResponseDto,
} from '@app/shared';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Transactions')
@UseInterceptors(ResponseInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('last-transactions')
  @HttpCode(200)
  async getTransactions(): Promise<TransactionsResponseDto> {
    return this.transactionService.getTransactions(20, 0);
  }

  @Post()
  @HttpCode(200)
  async getTransactionByHash(@Body() body: GetTransactionByHashRequestDto): Promise<TransactionResponseDto> {
    return this.transactionService.getTransactionByTxHash(body.transactionHash);
  }

  @Post('address')
  @HttpCode(200)
  async getAddressTransactions(@Body() body: GetAddressTransactionsDto): Promise<AddressesTransactionsResponseDto> {
    return this.transactionService.getTransactionsByAddress(body.limit, body.offset, body.address);
  }

  @Post('node')
  @HttpCode(200)
  async getNodeTransactions(@Body() body: GetNodeTransactionsDto): Promise<NodeTransactionsResponseDto> {
    return this.transactionService.getTransactionByNodeHash(body.limit, body.offset, body.nodeHash);
  }

  @Post('token')
  @HttpCode(200)
  async getTokenTransactions(@Body() body: GetTokenTransactionsDto): Promise<TransactionsResponseDto> {
    return this.transactionService.getTransactionByCurrencyHash(body.limit, body.offset, body.currencyHash);
  }
}
