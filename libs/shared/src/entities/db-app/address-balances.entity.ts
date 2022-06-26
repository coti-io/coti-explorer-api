import { exec } from '../../utils';
import { Column, Entity, getManager, In, JoinColumn, ManyToOne } from 'typeorm';
import { AddressTransactionCount } from './address-transaction-counts.entity';
import { BaseEntity } from '../base.entity';
import { Currency } from './currencies.entity';
import { DbAppEntitiesNames } from './entities.names';
import { DbAppTransaction, TransactionCurrency } from '@app/shared/entities';
import { WalletCountResponseDto } from '@app/shared/dtos';

@Entity(DbAppEntitiesNames.addressBalances)
export class AddressBalance extends BaseEntity {
  @Column()
  currencyId: number;

  @Column()
  addressHash: string;

  @Column('decimal')
  amount: string;

  @ManyToOne(() => Currency, currency => currency.addressBalance)
  @JoinColumn({ name: 'currencyId' })
  currency: Currency;
}

export async function getTransactionCount(addressHash: string): Promise<number> {
  const [txCountError, txCount] = await exec(getManager('db_app').getRepository<AddressTransactionCount>('address_transaction_counts').findOne({ addressHash }));
  if (txCountError) throw txCountError;
  return txCount ? txCount.count : 0;
}

export async function getActiveWalletsCount(): Promise<number> {
  const [walletCountError, walletCount] = await exec(
    getManager('db_app')
      .getRepository<AddressBalance>(DbAppEntitiesNames.addressBalances)
      .createQueryBuilder('ab')
      .select('COUNT(DISTINCT ab.addressHash) as count')
      .getRawOne<{ count: number }>(),
  );
  if (walletCountError) throw walletCountError;
  return walletCount ? walletCount.count : 0;
}

export async function getTransactionCurrenciesCount(currencyId: number): Promise<number> {
  const [txCountError, txCount] = await exec(
    getManager('db_app')
      .getRepository<TransactionCurrency>(DbAppEntitiesNames.transactionsCurrencies)
      .createQueryBuilder('tc')
      .select('COUNT(DISTINCT tc.transactionId) as count')
      .where({ currencyId })
      .getRawOne<{ count: number }>(),
  );
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

export async function getNativeBalance(addressHash: string): Promise<{ nativeBalance: string }> {
  const [balanceError, balance] = await exec(
    getManager('db_app').getRepository<AddressBalance>(DbAppEntitiesNames.addressBalances).createQueryBuilder('ab').where({ addressHash }).getOne(),
  );

  if (balanceError) {
    throw balanceError;
  }

  return { nativeBalance: balance.amount };
}

export async function getNativeBalances(addressHashes: string[]): Promise<{ [key: string]: string }> {
  const balanceMap: { [key: string]: string } = {};

  const [balancesError, balances] = await exec(
    getManager('db_app')
      .getRepository<AddressBalance>(DbAppEntitiesNames.addressBalances)
      .createQueryBuilder('ab')
      .where({ addressHash: In(addressHashes) })
      .getMany(),
  );

  if (balancesError) {
    throw balancesError;
  }

  for (const balance of balances) {
    balanceMap[balance.addressHash] = balance.amount;
  }

  return balanceMap;
}

export const getCountActiveAddresses = (): string => {
  return `
    SELECT 
    *
    FROM
    address_balances as ab
    WHERE 
    updateTime > DATE_ADD(NOW(), INTERVAL -10 MINUTE)
  `;
};
