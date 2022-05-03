import { Column, Entity, OneToOne } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { Currency } from './currencies.entity';
import { DbAppEntitiesNames } from './entities.names';
import { TokenGenerationServiceData } from '@app/shared/entities/db-app/token-generation-service-data.entity';

@Entity(DbAppEntitiesNames.currencyTypeData)
export class CurrencyTypeData extends BaseEntity {
  @Column()
  serviceDataId: number;

  @Column()
  currencyType: string;

  @Column()
  currencyRateSourceType: string;

  @Column()
  rateSource: string;

  @Column()
  protectionModel: string;
  @Column()
  signerHash: string;
  @Column('decimal')
  currencyTypeDataCreateTime: string;

  @OneToOne(() => TokenGenerationServiceData, tokenGenerationServiceData => tokenGenerationServiceData.currencyTypeResponseData)
  tokenGenerationServiceData: TokenGenerationServiceData;
}
