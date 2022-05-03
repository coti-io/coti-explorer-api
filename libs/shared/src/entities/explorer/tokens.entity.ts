import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ExplorerAppEntitiesNames } from './entities.names';

@Entity(ExplorerAppEntitiesNames.tokens)
export class TokenEntity extends BaseEntity {
  @Column()
  currencyHash: string;
  @Column()
  website: string;
  @Column()
  discord: string;
  @Column()
  telegram: string;
  @Column()
  twitter: string;
  @Column()
  gitbook: string;
  @Column()
  medium: string;
}
