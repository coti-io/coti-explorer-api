import { BaseTransactionName } from '../../dtos';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity()
export class BaseTransactionEntity extends BaseEntity {
  @Column()
  transactionId: number;

  @Column()
  hash: string;

  @Column()
  name: BaseTransactionName;

  @Column()
  addressHash: string;

  @Column('decimal')
  amount: number;
}
