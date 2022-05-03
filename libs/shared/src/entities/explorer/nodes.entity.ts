import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ExplorerAppEntitiesNames } from './entities.names';
import { NodeHashEntity } from '@app/shared/entities';

@Entity(ExplorerAppEntitiesNames.nodes)
export class NodeEntity extends BaseEntity {
  @Column()
  name: string;
  @Column()
  link: string;
  @Column()
  status: string;
  @Column()
  trustScore: string;
  @Column()
  feePercentage: string;
  @Column()
  minimumFee: string;
  @Column()
  maximumFee: string;
  @Column()
  activationTime: string;
  @Column()
  originalActivationTime: string;
  @Column()
  uptimeToday: string;
  @Column()
  uptimeLast7Days: string;
  @Column()
  uptimeLast14Days: string;
  @Column()
  uptimeLast30Days: string;
  @Column()
  version: string;

  @OneToMany(() => NodeHashEntity, nodeHashes => nodeHashes.node)
  nodeHashes: NodeHashEntity[];
}
