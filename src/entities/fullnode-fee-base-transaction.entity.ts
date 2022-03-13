import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTransactionEntity, DbAppTransaction } from '.';
@Entity('fullnode_fee_base_transactions')
export class FullnodeFeeBaseTransaction extends BaseTransactionEntity {
  @Column('decimal')
  originalAmount: number;

  @Column('decimal')
  fullnodeFeeCreateTime: number;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.fullnodeFeeBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
