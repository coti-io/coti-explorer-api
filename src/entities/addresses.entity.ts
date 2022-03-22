import { Column, Entity } from 'typeorm';

import { BaseEntity } from './base.entity';

@Entity('addresses')
export class Addresses extends BaseEntity {
  @Column()
  addressHash: string;
}
