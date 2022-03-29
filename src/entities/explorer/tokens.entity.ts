import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ExplorerAppEntitiesNames } from './entities.names';

@Entity(ExplorerAppEntitiesNames.tokens)
export class TokenEntity extends BaseEntity {
  @Column()
  iconUrl: string;
  @Column()
  currencyHash: string;
}
