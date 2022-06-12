import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { DbAppTransaction } from '.';
import { BaseTransactionEntity } from './base-transaction.entity';
import { DbAppEntitiesNames } from './entities.names';
import { TokenMintingServiceData } from '@app/shared/entities/db-app/token-minting-service-data.entity';

@Entity(DbAppEntitiesNames.tokenMintingFeeBaseTransactions)
export class TokenMintingFeeBaseTransaction extends BaseTransactionEntity {
  @Column('decimal')
  originalAmount: string;

  @Column()
  originalCurrencyHash: string;

  @Column()
  tokenMintingFeeCreateTime: string;

  @OneToOne(() => TokenMintingServiceData, tokenMintingServiceData => tokenMintingServiceData.tokenMintBaseTransaction)
  @JoinColumn({ name: 'id', referencedColumnName: 'baseTransactionId' })
  tokenMintingServiceData: TokenMintingServiceData;

  @ManyToOne(() => DbAppTransaction, transaction => transaction.tokenMintingFeeBaseTransactions)
  @JoinColumn({ name: 'transactionId', referencedColumnName: 'id' })
  baseTransaction: DbAppTransaction;
}
