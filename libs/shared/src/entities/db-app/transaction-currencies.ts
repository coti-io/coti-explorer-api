import { Column, Entity, getManager, In, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { DbAppEntitiesNames } from './entities.names';
import { Currency, DbAppTransaction } from '@app/shared/entities';
import { exec } from '@app/shared/utils';
import { number } from 'joi';

@Entity(DbAppEntitiesNames.transactionsCurrencies)
export class TransactionCurrency extends BaseEntity {
  @Column()
  transactionId: number;

  @Column()
  currencyId: number;

  @Column()
  attachmentTime: string;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.transactionCurrencies)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  transaction: DbAppTransaction;
}

export async function getCurrencyHashCountByCurrencyId(currencyIds: number[]): Promise<{ [key: number]: number }> {
  const transactionsCurrenciesCount: { [key: number]: number } = {};
  const query = getManager('db_app')
    .getRepository<TransactionCurrency>(DbAppEntitiesNames.transactionsCurrencies)
    .createQueryBuilder('tc')
    .select('COUNT(DISTINCT tc.transactionId) as count, currencyId')
    .where({ currencyId: In(currencyIds) })
    .groupBy('currencyId');
  const [currenciesError, currencies] = await exec(query.getRawMany<{ count: number; currencyId: number }>());
  if (currenciesError) {
    throw currenciesError;
  }

  for (const currency of currencies) {
    transactionsCurrenciesCount[currency.currencyId] = currency.count;
  }

  return transactionsCurrenciesCount;
}
