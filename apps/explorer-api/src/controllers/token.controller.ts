import { Body, Controller, HttpCode, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { TokenInfoRequestDto, TokenInfoResponseDto } from '@app/shared';
import { ExplorerExceptionFilter } from '../filters';
import { ResponseInterceptor } from '../interceptors';
import { TokenService } from '../services';

@UseInterceptors(ResponseInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('get-info')
  @HttpCode(200)
  async getTokenInfo(@Body() body: TokenInfoRequestDto): Promise<TokenInfoResponseDto> {
    return this.tokenService.getTokenInfo(body);
  }
}
