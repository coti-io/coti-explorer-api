import { Column, Entity, OneToOne } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { Currency } from './currencies.entity';
import { DbAppEntitiesNames } from './entities.names';
import { TokenGenerationServiceData } from '@app/shared/entities/db-app/token-generation-service-data.entity';

@Entity(DbAppEntitiesNames.originatorCurrencyData)
export class OriginatorCurrencyData extends BaseEntity {
  @Column()
  serviceDataId: number;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column()
  description: string;

  @Column()
  originatorHash: string;

  @Column('decimal')
  totalSupply: string;

  @Column()
  scale: number;

  @OneToOne(() => TokenGenerationServiceData, tokenGenerationServiceData => tokenGenerationServiceData.originatorCurrencyResponseData)
  tokenGenerationServiceData: TokenGenerationServiceData;

  @OneToOne(() => Currency, currency => currency.originatorCurrencyData)
  currency: Currency;
}
