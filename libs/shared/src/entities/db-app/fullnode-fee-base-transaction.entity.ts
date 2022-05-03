import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { DbAppTransaction } from '.';
import { BaseTransactionEntity } from './base-transaction.entity';
import { DbAppEntitiesNames } from './entities.names';
@Entity(DbAppEntitiesNames.fullnodeFeeBaseTransactions)
export class FullnodeFeeBaseTransaction extends BaseTransactionEntity {
  @Column('decimal')
  originalAmount: number;

  @Column('decimal')
  fullnodeFeeCreateTime: string;

  @Column()
  originalCurrencyHash: string;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.fullnodeFeeBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
