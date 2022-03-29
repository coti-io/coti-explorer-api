import { exec } from 'src/utils';
import { Column, Entity, getManager, In, JoinColumn, ManyToOne } from 'typeorm';
import { AddressTransactionCount } from './address-transaction-counts.entity';
import { BaseEntity } from '../base.entity';
import { Currency } from './currencies.entity';
import { DbAppEntitiesNames } from './entities.names';

@Entity(DbAppEntitiesNames.addressBalances)
export class AddressBalance extends BaseEntity {
  @Column()
  currencyId: number;

  @Column()
  addressHash: string;

  @Column('decimal')
  amount: number;

  @ManyToOne(() => Currency, currency => currency.addressBalance)
  @JoinColumn({ name: 'currencyId' })
  currency: Currency;
}

export async function getTransactionCount(addressHash: string): Promise<number> {
  const [txCountError, txCount] = await exec(getManager('db_app').getRepository<AddressTransactionCount>('address_transaction_counts').findOne({ addressHash }));
  if (txCountError) throw txCountError;
  return txCount ? txCount.count : 0;
}

export async function getTransactionsCount(addressesHash: string[]): Promise<{ [key: string]: number }> {
  const [txCountsError, txCounts] = await exec(
    getManager('db_app')
      .getRepository<AddressTransactionCount>('address_transaction_counts')
      .find({ addressHash: In(addressesHash) }),
  );
  if (txCountsError) throw txCountsError;
  const map = {};
  for (const txCount of txCounts) {
    map[txCount.addressHash] = txCount.count;
  }
  return map;
}
