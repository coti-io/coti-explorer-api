import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('address_transaction_counts')
export class AddressTransactionCount extends BaseEntity {
  @Column()
  count: number;

  @Column()
  addressHash: string;
}
