import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { DbAppEntitiesNames } from './entities.names';

@Entity(DbAppEntitiesNames.transactionsAddresses)
export class TransactionAddress extends BaseEntity {
  @Column()
  transactionId: number;

  @Column()
  addressId: number;

  @Column()
  attachmentTime: number;
}
