import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ExplorerAppEntitiesNames } from './entities.names';
import { NodeEntity } from '@app/shared/entities';

@Entity(ExplorerAppEntitiesNames.nodeHashes)
export class NodeHashEntity extends BaseEntity {
  @Column()
  nodeId: number;
  @Column()
  hash: string;
  @Column()
  isActive: boolean;

  @ManyToOne(() => NodeEntity, node => node.nodeHashes)
  @JoinColumn({ name: 'nodeId', referencedColumnName: 'id' })
  node: NodeEntity;
}
