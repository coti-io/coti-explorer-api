import { BaseTransactionName } from 'src/dtos/transaction.dto';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { DbAppTransaction } from '.';
import { BaseEntity } from './base.entity';

@Entity('fullnode_fee_base_transactions')
export class FullnodeFeeBaseTransaction extends BaseEntity {
  @Column()
  transactionId: number;

  @Column()
  hash: string;

  @Column()
  name: BaseTransactionName;

  @Column()
  addressHash: string;

  @Column('decimal')
  amount: number;

  @Column('decimal')
  originalAmount: number;

  @Column('decimal')
  fullnodeFeeCreateTime: number;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.fullnodeFeeBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
