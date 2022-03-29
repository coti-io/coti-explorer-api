import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTransactionEntity, DbAppTransaction } from '.';
import { DbAppEntitiesNames } from './entities.names';

@Entity(DbAppEntitiesNames.networkFeeBaseTransactions)
export class NetworkFeeBaseTransaction extends BaseTransactionEntity {
  @Column('decimal')
  originalAmount: number;

  @Column('decimal')
  reducedAmount: number;

  @Column('decimal')
  networkFeeCreateTime: number;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.networkFeeBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
