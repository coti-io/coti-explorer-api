import { IsString, MaxLength } from 'class-validator';
import { Currency } from '../entities/db-app';
import { NodeEntity, TokenEntity } from '../entities/explorer';

export class SearchResponseDto {
  tokens: TokenSearchResult[];
  nodes: NodeSearchResult[];
}

export class TokenSearchResult {
  name: string;
  symbol: string;
  description: string;
  originatorHash: string;
  totalSupply: string;
  scale: number;
  currencyHash: string;
  constructor(currency: Currency, toekn: TokenEntity) {
    this.name = currency.originatorCurrencyData.name;
    this.symbol = currency.originatorCurrencyData.symbol;
    this.description = currency.originatorCurrencyData.description;
    this.originatorHash = currency.originatorCurrencyData.originatorHash;
    this.totalSupply = currency.originatorCurrencyData.totalSupply;
    this.scale = currency.originatorCurrencyData.scale;
    this.currencyHash = currency.hash;
  }
}
export class NodeSearchResult {
  name: string;

  constructor(node: NodeEntity) {
    this.name = node.name;
  }
}

export class SearchRequestDto {
  @IsString()
  @MaxLength(200)
  criteria: string;
}
