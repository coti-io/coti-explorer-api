import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTransactionEntity, DbAppTransaction } from '.';
import { DbAppEntitiesNames } from './entities.names';

@Entity(DbAppEntitiesNames.inputBaseTransactions)
export class InputBaseTransaction extends BaseTransactionEntity {
  @Column()
  inputCreateTime: number;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.inputBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
