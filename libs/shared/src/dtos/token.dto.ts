import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { Currency } from '../entities/db-app';
import { TokenEntity } from '../entities/explorer';

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
  circulatingSupply: number;
  trustChainSupply: number;
  holders: number;
  createTime: string;

  constructor(currency: Currency, token: TokenEntity, circulatingSupply: number) {
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
    this.circulatingSupply = circulatingSupply;
    this.trustChainSupply = circulatingSupply;
    this.createTime = currency?.createTime.toString();
  }
}
