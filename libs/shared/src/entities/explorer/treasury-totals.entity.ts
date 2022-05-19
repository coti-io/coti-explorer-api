import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ExplorerAppEntitiesNames } from './entities.names';

@Entity(ExplorerAppEntitiesNames.treasuryTotals)
export class TreasuryTotalsEntity extends BaseEntity {
  @Column()
  totalCotiInPool: string;

  @Column()
  totalUnlocked: string;

  @Column()
  totalUnlockedUsd: string;

  @Column()
  totalLevragedCoti: string;

  @Column()
  tvl: string;

  @Column()
  maxApy: string;
}
