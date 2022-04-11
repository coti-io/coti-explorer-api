import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ExplorerAppEntitiesNames } from './entities.names';

@Entity(ExplorerAppEntitiesNames.nodes)
export class NodeWalletHashEntity extends BaseEntity {
  @Column()
  nodeId: number;
  @Column()
  walletHash: string;
}
