import { Logger } from '@nestjs/common';
import { Column, Entity, QueryRunner } from 'typeorm';
import { ExplorerAppEntitiesNames } from './entities.names';
import { BaseEntity } from './../base.entity';
import { exec } from '@app/shared';

const logger = new Logger('OpenIpsEntity');

@Entity(ExplorerAppEntitiesNames.openIps)
export class OpenIpsEntity extends BaseEntity {
  @Column()
  ip: string;

  @Column()
  description: string;
}

export async function isWhitelisted(queryRunner: QueryRunner, ip: string): Promise<boolean> {
  const [openIpError, openIp] = await exec(queryRunner.manager.getRepository<OpenIpsEntity>(ExplorerAppEntitiesNames.openIps).createQueryBuilder().where({ ip }).getOneOrFail());
  if (openIpError) {
    logger.error(openIpError);
    throw openIpError;
  }
  return !!openIp;
}
