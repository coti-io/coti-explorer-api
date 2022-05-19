import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ExplorerAppEntitiesNames } from './entities.names';

@Entity(ExplorerAppEntitiesNames.confirmationTimes)
export class ConfirmationTimeEntity extends BaseEntity {
  @Column()
  average: number;

  @Column()
  minimum: number;

  @Column()
  maximum: number;
}
