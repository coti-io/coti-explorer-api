import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../base.entity';
import { DbAppEntitiesNames } from './entities.names';

@Entity(DbAppEntitiesNames.addresses)
export class Addresses extends BaseEntity {
  @Column()
  addressHash: string;
}
