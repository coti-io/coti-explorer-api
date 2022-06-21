import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { DbAppEntitiesNames } from './entities.names';
import { DbAppTransaction } from '@app/shared/entities';

@Entity(DbAppEntitiesNames.transactionsCurrencies)
export class TransactionCurrency extends BaseEntity {
  @Column()
  transactionId: number;

  @Column()
  currencyId: number;

  @Column()
  attachmentTime: string;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.transactionCurrencies)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  transaction: DbAppTransaction;
}
