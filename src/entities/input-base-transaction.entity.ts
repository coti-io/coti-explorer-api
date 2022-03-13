import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTransactionEntity, DbAppTransaction } from '.';

@Entity('input_base_transactions')
export class InputBaseTransaction extends BaseTransactionEntity {
  @Column()
  inputCreateTime: number;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.inputBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
