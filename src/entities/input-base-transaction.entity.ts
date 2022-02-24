import { BaseTransactionName } from 'src/dtos/transaction.dto';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { DbAppTransaction } from '.';
import { BaseEntity } from './base.entity';

@Entity('input_base_transactions')
export class InputBaseTransaction extends BaseEntity {
  @Column()
  transactionId: number;

  @Column()
  hash: string;

  @Column()
  name: BaseTransactionName;

  @Column()
  addressHash: string;

  @Column('double')
  amount: number;

  @Column('double')
  inputCreateTime: number;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.inputBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
