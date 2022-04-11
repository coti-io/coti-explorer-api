import { IsNotEmpty, IsString } from 'class-validator';
import { Currency } from '../entities/db-app';
import { TokenEntity } from '../entities/explorer';

export class TokenInfoRequestDto {
  @IsString()
  @IsNotEmpty()
  currencyHash: string;
}

export class TokenInfoResponseDto {
  name: string;
  symbol: string;
  iconUrl: string;
  description: string;
  originatorHash: string;
  totalSupply: number;
  scale: number;
  currencyHash: string;
  website: string;
  discord: string;
  telegram: string;
  twitter: string;
  gitbook: string;
  medium: string;
  circulatingSupply: number;
  holders: number;

  constructor(currency: Currency, token: TokenEntity, circulatingSupply: number) {
    this.name = currency.originatorCurrencyData.name;
    this.symbol = currency.originatorCurrencyData.symbol;
    this.iconUrl = token?.iconUrl;
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
  }
}
