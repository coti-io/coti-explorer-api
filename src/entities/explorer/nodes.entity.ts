import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ExplorerAppEntitiesNames } from './entities.names';

@Entity(ExplorerAppEntitiesNames.nodes)
export class NodeEntity extends BaseEntity {
  @Column()
  name: string;
  @Column()
  iconUrl: string;
}
