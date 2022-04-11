import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { DbAppEntitiesNames } from './entities.names';

@Entity(DbAppEntitiesNames.addressTransactionCounts)
export class AddressTransactionCount extends BaseEntity {
  @Column()
  count: number;

  @Column()
  addressHash: string;
}
