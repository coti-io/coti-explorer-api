import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { DbAppTransaction } from '.';
import { BaseTransactionEntity } from './base-transaction.entity';
import { DbAppEntitiesNames } from './entities.names';

@Entity(DbAppEntitiesNames.receiverBaseTransactions)
export class ReceiverBaseTransaction extends BaseTransactionEntity {
  @Column('decimal')
  originalAmount: string;

  @Column()
  receiverCreateTime: string;

  @Column({ nullable: true })
  receiverDescription: string;

  @Column()
  originalCurrencyHash: string;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.receiverBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
