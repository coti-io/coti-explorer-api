import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { DbAppEntitiesNames } from './entities.names';
import { DbAppTransaction } from '@app/shared/entities';

@Entity(DbAppEntitiesNames.transactionsAddresses)
export class TransactionAddress extends BaseEntity {
  @Column()
  transactionId: number;

  @Column()
  addressId: number;

  @Column()
  attachmentTime: string;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.transactionAddresses)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  transaction: DbAppTransaction;
}
