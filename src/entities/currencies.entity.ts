import { Column, Entity, OneToMany } from 'typeorm';
import { AddressBalance } from './address-balances.entity';
import { BaseEntity } from './base.entity';

@Entity('currencies')
export class Currency extends BaseEntity {
  @Column()
  originatorCurrencyDataId: number;

  @Column()
  hash: string;

  @Column('decimal')
  amount: number;

  @OneToMany(() => AddressBalance, addressBalance => addressBalance.currency)
  addressBalance: AddressBalance[];
}
