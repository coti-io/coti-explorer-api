import { Body, Controller, HttpCode, Post, Put, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  CreateTokenInfoRequestDto,
  TokenInfoBySymbolRequestDto,
  TokenInfoRequestDto,
  TokenInfoResponseDto,
  TokenRequestDto,
  TokensInfoResponseDto,
  TokenUploadImageUrlResponseDto,
} from '@app/shared';
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
  async getInfo(@Body() body: TokenRequestDto): Promise<TokensInfoResponseDto> {
    return this.tokenService.getTokensInfo(body);
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

// receive error 500 with status 400
// If token info does not exist return relevant error
// put in the correct folder in the s3 bucket
// update network key at the env of foxnet
// Check 2 new socket events transactionConfirmationUpdate, numberOfActiveAddresses
// Fix transaction count for shai
// adressTranscation return only transfer
// new event for count token transaction
