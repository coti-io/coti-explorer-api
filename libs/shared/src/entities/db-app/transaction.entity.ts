import { TransactionType } from '../../dtos';
import { exec } from '../../utils';
import { Column, Entity, getManager, In, Not, OneToMany } from 'typeorm';
import { FullnodeFeeBaseTransaction, NetworkFeeBaseTransaction, ReceiverBaseTransaction, TransactionAddress } from '.';
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
  nodeHash: string;

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

  @OneToMany(() => TransactionAddress, transactionAddresses => transactionAddresses.transaction)
  transactionAddresses: TransactionAddress;

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

export const getTransactionsQuery = (): string => {
  return `
    SELECT 
    transactions.id,
    transactions.updateTime
    FROM
    transactions as transactions
    WHERE 
    updateTime > DATE_ADD(NOW(), INTERVAL -10 MINUTE)
  `;
};

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
    .leftJoinAndSelect('tmbt.tokenMintingServiceData', 'tmsd')
    .leftJoinAndSelect('tgbt.tokenGenerationServiceData', 'tgsd')
    .leftJoinAndSelect('tgsd.originatorCurrencyData', 'ocd')
    .leftJoinAndSelect('tgsd.currencyTypeData', 'ctd')
    .where({ id: In(transactionIds) })
    .andWhere({ type: Not(TransactionType.ZEROSPEND) })
    .orderBy({ attachmentTime: 'DESC' });
  const [transactionsError, transactions] = await exec(query.getMany());
  if (transactionsError) {
    throw transactionsError;
  }
  return transactions;
}
