import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('transaction_addresses')
export class TransactionAddress extends BaseEntity {
  @Column()
  transactionId: number;

  @Column()
  addressId: number;

  @Column()
  attachmentTime: number;
}
