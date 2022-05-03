import { BaseTransactionEvent, BaseTransactionName, TransactionType } from '../../dtos';
import { exec } from '../../utils';
import { Column, Entity, EntityManager, getManager, In, OneToMany } from 'typeorm';
import { FullnodeFeeBaseTransaction, NetworkFeeBaseTransaction, ReceiverBaseTransaction } from '.';
import { BaseEntity } from '../base.entity';
import { DbAppEntitiesNames } from './entities.names';
import { InputBaseTransaction } from './input-base-transaction.entity';
import { TokenMintingFeeBaseTransaction } from '@app/shared/entities/db-app/token-minting-fee-base-transaction.entity';
import { TokenGenerationFeeBaseTransaction } from '@app/shared/entities/db-app/token-generation-fee-base-transaction.entity';

@Entity(DbAppEntitiesNames.transactions)
export class DbAppTransaction extends BaseEntity {
  @Column()
  hash: string;

  @Column()
  index: number;

  @Column()
  amount: string;

  @Column()
  attachmentTime: string;

  @Column()
  isValid: string;

  @Column()
  transactionCreateTime: string;

  @Column()
  leftParentHash: string;

  @Column()
  rightParentHash: string;

  @Column()
  senderHash: string;

  @Column()
  senderTrustScore: number;

  @Column()
  trustChainTrustScore: number;

  @Column()
  transactionConsensusUpdateTime: string;

  @Column()
  transactionDescription: string;

  @Column()
  trustChainConsensus: boolean;

  @Column()
  type: TransactionType;

  @OneToMany(() => ReceiverBaseTransaction, receiverBaseTransactions => receiverBaseTransactions.baseTransaction)
  receiverBaseTransactions: ReceiverBaseTransaction[];

  @OneToMany(() => InputBaseTransaction, inputBaseTransactions => inputBaseTransactions.baseTransaction)
  inputBaseTransactions: InputBaseTransaction[];

  @OneToMany(() => FullnodeFeeBaseTransaction, fullnodeFeeBaseTransactions => fullnodeFeeBaseTransactions.baseTransaction)
  fullnodeFeeBaseTransactions: FullnodeFeeBaseTransaction[];

  @OneToMany(() => NetworkFeeBaseTransaction, networkFeeBaseTransactions => networkFeeBaseTransactions.baseTransaction)
  networkFeeBaseTransactions: NetworkFeeBaseTransaction[];

  @OneToMany(() => TokenMintingFeeBaseTransaction, tokenMintingFeeBaseTransactions => tokenMintingFeeBaseTransactions.baseTransaction)
  tokenMintingFeeBaseTransactions: TokenMintingFeeBaseTransaction[];

  @OneToMany(() => TokenGenerationFeeBaseTransaction, tokenGenerationFeeBaseTransactions => tokenGenerationFeeBaseTransactions.baseTransaction)
  tokenGenerationFeeBaseTransactions: TokenGenerationFeeBaseTransaction[];

  baseTransactions: (InputBaseTransaction | ReceiverBaseTransaction | FullnodeFeeBaseTransaction | NetworkFeeBaseTransaction)[];
}

export const getNewTransactions = () => {
  return `
    SELECT 
    transactions.id
    FROM
    transactions as transactions
    WHERE 
    updateTime > DATE_ADD(NOW(), INTERVAL -10 MINUTE)
    AND transactionConsensusUpdateTime IS NULL
    ORDER BY transactions.attachmentTime DESC
  `;
};
export const getConfirmedTransactions = () => {
  return `
    SELECT 
    transactions.id
    FROM
    transactions as transactions
    WHERE 
    updateTime > DATE_ADD(NOW(), INTERVAL -10 MINUTE)
    AND transactionConsensusUpdateTime IS NOT NULL
    ORDER BY transactions.attachmentTime DESC
  `;
};

export async function getRelatedInputs(transactionId: number): Promise<BaseTransactionEvent[]> {
  const [ibtsError, ibts] = await exec(getManager('db_app').getRepository<InputBaseTransaction>('input_base_transactions').find({ transactionId }));
  if (ibtsError) throw ibtsError;

  return ibts.map(ibt => {
    return { name: BaseTransactionName.INPUT, addressHash: ibt.addressHash };
  });
}

export async function getTransactionsById(transactionIds: number[]): Promise<DbAppTransaction[]> {
  const query = getManager('db_app')
    .getRepository<DbAppTransaction>('transactions')
    .createQueryBuilder('t')
    .leftJoinAndSelect('t.inputBaseTransactions', 'ibt')
    .leftJoinAndSelect('t.receiverBaseTransactions', 'rbt')
    .leftJoinAndSelect('t.fullnodeFeeBaseTransactions', 'ffbt')
    .leftJoinAndSelect('t.networkFeeBaseTransactions', 'nfbt')
    .leftJoinAndSelect('t.tokenMintingFeeBaseTransactions', 'tmbt')
    .leftJoinAndSelect('t.tokenGenerationFeeBaseTransactions', 'tgbt')
    .leftJoinAndSelect('tmbt.tokenMintingServiceResponseData', 'tmsd')
    .leftJoinAndSelect('tgbt.tokenGenerationServiceResponseData', 'tgsd')
    .leftJoinAndSelect('tgsd.originatorCurrencyResponseData', 'ocd')
    .leftJoinAndSelect('tgsd.currencyTypeResponseData', 'ctd')
    .where({ id: In(transactionIds) })
    .orderBy({ attachmentTime: 'DESC' });
  const [transactionsError, transactions] = await exec(query.getMany());
  if (transactionsError) {
    throw transactionsError;
  }
  return transactions;
}
