import { Column, Entity, OneToOne } from 'typeorm';
import { DbAppEntitiesNames } from './entities.names';
import { BaseEntity } from './../base.entity';
import { TokenMintingFeeBaseTransaction } from '@app/shared/entities/db-app/token-minting-fee-base-transaction.entity';

@Entity(DbAppEntitiesNames.tokenMintingServiceData)
export class TokenMintingServiceData extends BaseEntity {
  @Column()
  baseTransactionId: number;

  @Column()
  mintingCurrencyHash: string;

  @Column()
  mintingAmount: string;

  @Column('decimal')
  serviceDataCreateTime: string;

  @Column()
  receiverAddress: string;

  @Column('decimal')
  feeAmount: string;

  @Column()
  signerHash: string;

  @OneToOne(() => TokenMintingFeeBaseTransaction, tokenMintingFeeBaseTransaction => tokenMintingFeeBaseTransaction.tokenMintingServiceData)
  tokenMintBaseTransaction: TokenMintingFeeBaseTransaction;
}

export const getTmsdUpdate = (): string => {
  return `
    SELECT 
    *
    FROM
    token_minting_service_data as tmsd
    WHERE 
    updateTime > DATE_ADD(NOW(), INTERVAL -10 MINUTE)
  `;
};
