import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { DbAppTransaction } from '.';
import { BaseTransactionEntity } from './base-transaction.entity';
import { DbAppEntitiesNames } from './entities.names';

@Entity(DbAppEntitiesNames.networkFeeBaseTransactions)
export class NetworkFeeBaseTransaction extends BaseTransactionEntity {
  @Column('decimal')
  originalAmount: string;

  @Column('decimal')
  reducedAmount: string;

  @Column('decimal')
  networkFeeCreateTime: string;

  @Column()
  originalCurrencyHash: string;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.networkFeeBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
