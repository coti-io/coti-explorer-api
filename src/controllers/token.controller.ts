import { Body, Controller, HttpCode, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { ExplorerResponse, TokenInfoRequestDto, TokenInfoResponseDto } from 'src/dtos';
import { ExplorerExceptionFilter } from 'src/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/interceptors/response.interceptor';
import { TokenService, TransactionService } from 'src/services';
import { WalletService } from 'src/services/wallet.service';

@UseInterceptors(ResponseInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService, private readonly transactionService: TransactionService) {}

  @Post('get-info')
  @HttpCode(200)
  async getTokenInfo(@Body() body: TokenInfoRequestDto): Promise<TokenInfoResponseDto> {
    return this.tokenService.getTokenInfo(body);
  }
}
