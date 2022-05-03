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

  @OneToOne(() => TokenMintingFeeBaseTransaction, tokenMintingFeeBaseTransaction => tokenMintingFeeBaseTransaction.tokenMintingServiceResponseData)
  tokenMintBaseTransaction: TokenMintingFeeBaseTransaction;
}
