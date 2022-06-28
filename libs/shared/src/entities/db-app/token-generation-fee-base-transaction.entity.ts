import { Column, Entity, EntityManager, getManager, In, JoinColumn, ManyToOne, Not, OneToOne } from 'typeorm';
import { DbAppTransaction } from '.';
import { BaseTransactionEntity } from './base-transaction.entity';
import { DbAppEntitiesNames } from './entities.names';
import { TokenGenerationServiceData } from './token-generation-service-data.entity';
import { exec } from '@app/shared/utils';

@Entity(DbAppEntitiesNames.tokenGenerationFeeBaseTransactions)
export class TokenGenerationFeeBaseTransaction extends BaseTransactionEntity {
  @Column('decimal')
  originalAmount: string;

  @Column()
  originalCurrencyHash: string;

  @Column()
  fullnodeFeeCreateTime: string;

  @OneToOne(() => TokenGenerationServiceData, tokenGenerationServiceData => tokenGenerationServiceData.tokenGenerationBaseTransaction)
  @JoinColumn({ name: 'id', referencedColumnName: 'baseTransactionId' })
  tokenGenerationServiceData: TokenGenerationServiceData;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.tokenMintingFeeBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}

export async function getTotalTgbts(dbAppManager: EntityManager): Promise<number> {
  const query = dbAppManager
    .getRepository<TokenGenerationFeeBaseTransaction>(DbAppEntitiesNames.tokenGenerationFeeBaseTransactions)
    .createQueryBuilder('tgbt')
    .innerJoinAndSelect('tgbt.baseTransaction', 't');
  const [tgbtIdsError, tgbtIds] = await exec(query.getMany());
  if (tgbtIdsError) {
    throw tgbtIdsError;
  }
  return tgbtIds.length;
}
