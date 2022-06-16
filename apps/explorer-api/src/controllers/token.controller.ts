import { Body, Controller, HttpCode, Post, Put, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { CreateTokenInfoRequestDto, TokenInfoBySymbolRequestDto, TokenInfoRequestDto, TokenInfoResponseDto, TokenUploadImageUrlResponseDto } from '@app/shared';
import { ExplorerExceptionFilter } from '../filters';
import { ExtendedMulterFile, FileExtender, ResponseInterceptor } from '../interceptors';
import { TokenService } from '../services';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminApiKeyAuthGuard } from '../guards/admin-api-key-auth.guard';

@ApiTags('Token')
@UseInterceptors(ResponseInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post()
  @HttpCode(200)
  async getInfo(): Promise<TokenInfoResponseDto[]> {
    return this.tokenService.getTokensInfo();
  }

  @ApiBearerAuth()
  @UseGuards(AdminApiKeyAuthGuard)
  @Put('info')
  @HttpCode(201)
  async createInfo(@Body() body: CreateTokenInfoRequestDto): Promise<TokenInfoResponseDto> {
    return this.tokenService.createTokenExtraDetails(body);
  }

  @Post('get-info')
  @HttpCode(200)
  async getTokenInfo(@Body() body: TokenInfoRequestDto): Promise<TokenInfoResponseDto> {
    return this.tokenService.getTokenInfo(body);
  }

  @Post('symbol')
  @HttpCode(200)
  async getTokenInfoBySymbol(@Body() body: TokenInfoBySymbolRequestDto): Promise<TokenInfoResponseDto> {
    return this.tokenService.getTokenInfoBySymbol(body);
  }

  @UseGuards(AdminApiKeyAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiBearerAuth()
  @Post('upload-icon')
  @UseInterceptors(FileExtender)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile('file') file: ExtendedMulterFile): Promise<TokenUploadImageUrlResponseDto> {
    return this.tokenService.uploadIcon(file);
  }
}
