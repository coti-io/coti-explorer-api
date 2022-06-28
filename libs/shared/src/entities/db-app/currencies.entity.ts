import { Column, Entity, getManager, In, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AddressBalance } from './address-balances.entity';
import { BaseEntity } from '../base.entity';
import { OriginatorCurrencyData } from './originator-currency-data.entity';
import { DbAppEntitiesNames } from './entities.names';
import { exec } from '@app/shared/utils';
import { DbAppTransaction } from '@app/shared/entities';
import { TokenBalances } from '@app/shared/dtos';

@Entity(DbAppEntitiesNames.currencies)
export class Currency extends BaseEntity {
  @Column()
  transactionId: number;

  @Column()
  originatorCurrencyDataId: number;

  @Column()
  hash: string;

  @OneToMany(() => AddressBalance, addressBalance => addressBalance.currency)
  addressBalance: AddressBalance[];

  @OneToOne(() => OriginatorCurrencyData, originatorCurrencyData => originatorCurrencyData.currency)
  @JoinColumn({ name: 'originatorCurrencyDataId' })
  originatorCurrencyData: OriginatorCurrencyData;

  @OneToOne(() => DbAppTransaction, transaction => transaction.currency)
  @JoinColumn({ name: 'transactionId' })
  transaction: DbAppTransaction;
}

export async function getTokensSymbols(transactions: DbAppTransaction[]): Promise<{ [key: string]: string }> {
  const currencyHashes = getTransactionsCurrencyHash(transactions);
  const query = getManager('db_app')
    .getRepository<Currency>(DbAppEntitiesNames.currencies)
    .createQueryBuilder('c')
    .innerJoinAndSelect('c.originatorCurrencyData', 'ocd')
    .where({ hash: In(currencyHashes) });
  const [currenciesError, currencies] = await exec(query.getMany());
  if (currenciesError) {
    throw currenciesError;
  }
  const tokenSymbolsMap = {};
  for (const c of currencies) {
    tokenSymbolsMap[c.hash] = c.originatorCurrencyData.symbol;
  }
  return tokenSymbolsMap;
}

export async function getCurrencyIdsByCurrencyHashes(currencyHashes: string[]): Promise<Currency[]> {
  const query = getManager('db_app')
    .getRepository<Currency>(DbAppEntitiesNames.currencies)
    .createQueryBuilder('c')
    .where({ hash: In(currencyHashes) });
  const [currenciesError, currencies] = await exec(query.getMany());
  if (currenciesError) {
    throw currenciesError;
  }

  return currencies;
}

export async function getTokenBalances(address: string): Promise<TokenBalances> {
  const query = getManager('db_app')
    .getRepository<AddressBalance>(DbAppEntitiesNames.addressBalances)
    .createQueryBuilder('ab')
    .leftJoinAndSelect('ab.currency', 'c')
    .leftJoinAndSelect('c.originatorCurrencyData', 'ocd') //, `ocd.symbol = :symbol`, { symbol: symbol })
    .where({ addressHash: address })
    .andWhere(`ocd.symbol <> 'coti'`);

  const [tokenDataError, tokenData] = await exec(query.getMany());
  if (tokenDataError) {
    throw tokenDataError;
  }

  if (Object.keys(tokenData).length === 0) {
    return;
  }

  const res: TokenBalances = {};

  for (const token of tokenData) {
    res[token.currency.hash] = {
      symbol: token.currency.originatorCurrencyData.symbol,
      balance: token.amount,
    };
  }

  return res;
}

export function getTransactionsCurrencyHash(transactions: DbAppTransaction[]): string[] {
  const currencyHashMap = {};
  for (const tx of transactions) {
    for (const bt of tx.inputBaseTransactions) {
      if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
    }
    for (const bt of tx.receiverBaseTransactions) {
      if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
    }
    for (const bt of tx.fullnodeFeeBaseTransactions) {
      if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
    }
    for (const bt of tx.networkFeeBaseTransactions) {
      if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
    }
    for (const bt of tx.tokenGenerationFeeBaseTransactions) {
      if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
    }
    for (const bt of tx.tokenMintingFeeBaseTransactions) {
      if (bt.currencyHash) currencyHashMap[bt.currencyHash] = 1;
    }
  }

  return Object.keys(currencyHashMap);
}
