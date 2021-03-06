import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { Currency } from '../entities/db-app';
import { TokenEntity } from '../entities/explorer';
import { Optional } from '@nestjs/common';

export class TokenRequestDto {
  @Optional()
  @IsNumber()
  @Max(50)
  @Min(0)
  limit = 50;

  @Optional()
  @IsNumber()
  @Min(0)
  offset = 0;
}

export class TokenInfoRequestDto {
  @IsString()
  @IsNotEmpty()
  currencyHash: string;
}

export class TokenInfoBySymbolRequestDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;
}

export class CreateTokenInfoRequestDto {
  @IsString()
  @IsNotEmpty()
  currencyHash: string;
  @IsUrl()
  @IsOptional()
  website: string;
  @IsUrl()
  @IsOptional()
  discord: string;
  @IsUrl()
  @IsOptional()
  telegram: string;
  @IsUrl()
  @IsOptional()
  twitter: string;
  @IsUrl()
  @IsOptional()
  gitbook: string;
  @IsUrl()
  @IsOptional()
  medium: string;
}

export class TokenUploadImageUrlResponseDto {
  iconUrl: string;
}

export class TokensInfoResponseDto {
  count: number;
  tokenInfoList: TokenInfoResponseDto[];
}

export class TokenInfoResponseDto {
  uuid: string;
  name: string;
  symbol: string;
  iconUrl: string;
  description: string;
  originatorHash: string;
  totalSupply: string;
  scale: number;
  currencyHash: string;
  website: string;
  discord: string;
  telegram: string;
  twitter: string;
  gitbook: string;
  medium: string;
  circulatingSupply: string;
  trustChainSupply: string;
  holders: number;
  attachmentTime: string;

  constructor(currency: Currency, token: TokenEntity, circulatingSupply: string) {
    this.name = currency.originatorCurrencyData.name;
    this.symbol = currency.originatorCurrencyData.symbol;
    this.description = currency.originatorCurrencyData.description;
    this.originatorHash = currency.originatorCurrencyData.originatorHash;
    this.totalSupply = currency.originatorCurrencyData.totalSupply;
    this.scale = currency.originatorCurrencyData.scale;
    this.currencyHash = currency.hash;
    this.website = token?.website;
    this.twitter = token?.twitter;
    this.discord = token?.discord;
    this.telegram = token?.telegram;
    this.gitbook = token?.gitbook;
    this.medium = token?.medium;
    this.circulatingSupply = circulatingSupply || '0';
    this.trustChainSupply = circulatingSupply || '0';
    this.attachmentTime = currency?.transaction?.attachmentTime;
  }
}
