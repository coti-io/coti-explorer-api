import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTransactionEntity, DbAppTransaction } from '.';

@Entity('receiver_base_transactions')
export class ReceiverBaseTransaction extends BaseTransactionEntity {
  @Column('decimal')
  originalAmount: number;

  @Column()
  receiverCreateTime: number;

  @Column({ nullable: true })
  receiverDescription: string;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.receiverBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
