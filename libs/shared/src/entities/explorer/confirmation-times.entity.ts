import { Column, Entity, getManager, In } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ExplorerAppEntitiesNames } from './entities.names';
import { Currency, DbAppEntitiesNames, DbAppTransaction, getTransactionsCurrencyHash } from '@app/shared/entities';
import { exec } from '@app/shared/utils';
import { TransactionConfirmationEventDto } from '@app/shared/dtos';

@Entity(ExplorerAppEntitiesNames.confirmationTimes)
export class ConfirmationTimeEntity extends BaseEntity {
  @Column()
  average: number;

  @Column()
  minimum: number;

  @Column()
  maximum: number;
}

export async function getConfirmationTime(): Promise<TransactionConfirmationEventDto> {
  const query = getManager().getRepository<ConfirmationTimeEntity>(ExplorerAppEntitiesNames.confirmationTimes).createQueryBuilder('c').orderBy('id', 'DESC');
  const [lastConfirmationError, lastConfirmation] = await exec(query.getOne());
  if (lastConfirmationError) {
    throw lastConfirmationError;
  }

  return {
    average: lastConfirmation.average,
    maximum: lastConfirmation.maximum,
    minimum: lastConfirmation.minimum,
  };
}

export const getConfirmationTimeUpdate = (): string => {
  return `
    SELECT 
    *
    FROM
    confirmation_times as ct
    WHERE 
    updateTime > DATE_ADD(NOW(), INTERVAL -10 MINUTE) 
  `;
};
