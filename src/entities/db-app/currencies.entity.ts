import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AddressBalance } from './address-balances.entity';
import { BaseEntity } from '../base.entity';
import { OriginatorCurrencyData } from './originator-currency-data.entity';
import { DbAppEntitiesNames } from './entities.names';

@Entity(DbAppEntitiesNames.currencies)
export class Currency extends BaseEntity {
  @Column()
  originatorCurrencyDataId: number;

  @Column()
  hash: string;

  @OneToMany(() => AddressBalance, addressBalance => addressBalance.currency)
  addressBalance: AddressBalance[];

  @OneToOne(() => OriginatorCurrencyData, orginatorCurrencyData => orginatorCurrencyData.currency)
  @JoinColumn({ name: 'originatorCurrencyDataId' })
  originatorCurrencyData: OriginatorCurrencyData;
}
