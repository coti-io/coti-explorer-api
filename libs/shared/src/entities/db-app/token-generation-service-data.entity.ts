import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { DbAppEntitiesNames } from './entities.names';
import { BaseEntity } from './../base.entity';
import { TokenGenerationFeeBaseTransaction } from '@app/shared/entities/db-app/token-generation-fee-base-transaction.entity';
import { CurrencyTypeData } from '@app/shared/entities/db-app/currency-type-data.entity';
import { OriginatorCurrencyData } from '@app/shared';

@Entity(DbAppEntitiesNames.tokenGenerationServiceData)
export class TokenGenerationServiceData extends BaseEntity {
  @Column()
  baseTransactionId: number;
  @Column('decimal')
  feeAmount: string;

  @OneToOne(() => CurrencyTypeData, currencyTypeData => currencyTypeData.tokenGenerationServiceData)
  @JoinColumn({ name: 'id', referencedColumnName: 'serviceDataId' })
  currencyTypeData: CurrencyTypeData;

  @OneToOne(() => OriginatorCurrencyData, originatorCurrencyData => originatorCurrencyData.tokenGenerationServiceData)
  @JoinColumn({ name: 'id', referencedColumnName: 'serviceDataId' })
  originatorCurrencyData: OriginatorCurrencyData;

  @OneToOne(() => TokenGenerationFeeBaseTransaction, tokenGenerationBaseTransaction => tokenGenerationBaseTransaction.tokenGenerationServiceData)
  @JoinColumn({ name: 'baseTransactionId', referencedColumnName: 'id' })
  tokenGenerationBaseTransaction: TokenGenerationFeeBaseTransaction;
}
