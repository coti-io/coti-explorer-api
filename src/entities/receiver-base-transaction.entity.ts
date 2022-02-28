import { BaseTransactionName } from 'src/dtos/transaction.dto';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { DbAppTransaction } from '.';
import { BaseEntity } from './base.entity';

@Entity('receiver_base_transactions')
export class ReceiverBaseTransaction extends BaseEntity {
  @Column()
  transactionId: number;

  @Column()
  hash: string;

  @Column()
  name: BaseTransactionName;

  @Column()
  addressHash: string;

  @Column()
  amount: number;

  @Column()
  receiverCreateTime: number;

  @Column()
  originalAmount: number;

  @Column({ nullable: true })
  receiverDescription: string;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.receiverBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
