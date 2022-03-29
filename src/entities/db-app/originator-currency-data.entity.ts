import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { Currency } from './currencies.entity';
import { DbAppEntitiesNames } from './entities.names';

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
  totalSupply: number;

  @Column()
  scale: number;

  @OneToOne(() => Currency, currency => currency.originatorCurrencyData)
  currency: Currency;
}
