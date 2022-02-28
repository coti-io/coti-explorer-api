import { BaseTransactionEvent, BaseTransactionName, TransactionType } from 'src/dtos/transaction.dto';
import { exec } from 'src/utils/promise-helper';
import { Column, Entity, getManager, OneToMany } from 'typeorm';
import { FullnodeFeeBaseTransaction, NetworkFeeBaseTransaction, ReceiverBaseTransaction } from '.';
import { BaseEntity } from './base.entity';
import { InputBaseTransaction } from './input-base-transaction.entity';

@Entity('transactions')
export class DbAppTransaction extends BaseEntity {
  @Column()
  hash: string;

  @Column()
  index: number;

  @Column('decimal')
  amount: string;

  @Column()
  attachmentTime: number;

  @Column()
  isValid: string;

  @Column()
  transactionCreateTime: number;

  @Column()
  leftParentHash: string;

  @Column()
  rightParentHash: string;

  @Column()
  senderHash: string;

  @Column()
  senderTrustScore: number;

  @Column()
  transactionConsensusUpdateTime: number;

  @Column()
  transactionDescription: string;

  @Column()
  trustChainConsensus: number;

  @Column()
  type: TransactionType;

  @OneToMany(() => ReceiverBaseTransaction, receiversbaseTransactions => receiversbaseTransactions.baseTransaction)
  receiverBaseTransactions: ReceiverBaseTransaction[];

  @OneToMany(() => InputBaseTransaction, inputBaseTransactions => inputBaseTransactions.baseTransaction)
  inputBaseTransactions: InputBaseTransaction[];

  @OneToMany(() => FullnodeFeeBaseTransaction, fullnodeFeeBaseTransactions => fullnodeFeeBaseTransactions.baseTransaction)
  fullnodeFeeBaseTransactions: FullnodeFeeBaseTransaction[];

  @OneToMany(() => NetworkFeeBaseTransaction, networkFeeBaseTransactions => networkFeeBaseTransactions.baseTransaction)
  networkFeeBaseTransactions: NetworkFeeBaseTransaction[];

  baseTransactions: (InputBaseTransaction | ReceiverBaseTransaction | FullnodeFeeBaseTransaction | NetworkFeeBaseTransaction)[];
}

export const newTransaction = () => {
  return `
    SELECT 
    transactions.id,
    transactions.attachmentTime,
    transactions.type,
    transactions.hash,
    transactions.transactionConsensusUpdateTime,
    transactions.amount,
    rbt.addressHash as receiverAddressHash,
    nfbt.amount as nfbtAmount,
    ffbt.amount as ffbtAmount
    FROM
    db_sync_staging.transactions as transactions
    LEFT JOIN db_sync_staging.receiver_base_transactions as rbt ON transactions.id = rbt.transactionId
    LEFT JOIN db_sync_staging.fullnode_fee_base_transactions as ffbt ON transactions.id = ffbt.transactionId
    LEFT JOIN db_sync_staging.network_fee_base_transactions as nfbt ON transactions.id = nfbt.transactionId 
    WHERE 
    transactions.transactionConsensusUpdateTime is null OR
    transactions.transactionConsensusUpdateTime = 0 and transactions.updateTime > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
  `;
};

export const approvedTransaction = () => {
  return `
    SELECT 
    transactions.id,
    transactions.attachmentTime,
    transactions.type,
    transactions.hash,
    transactions.transactionConsensusUpdateTime,
    transactions.amount,
    rbt.addressHash as receiverAddressHash,
    nfbt.amount as nfbtAmount,
    ffbt.amount as ffbtAmount
    FROM
    db_sync_staging.transactions as transactions
    LEFT JOIN db_sync_staging.receiver_base_transactions as rbt ON transactions.id = rbt.transactionId
    LEFT JOIN db_sync_staging.fullnode_fee_base_transactions as ffbt ON transactions.id = ffbt.transactionId
    LEFT JOIN db_sync_staging.network_fee_base_transactions as nfbt ON transactions.id = nfbt.transactionId 
    WHERE 
    transactions.transactionConsensusUpdateTime > 0 and transactions.updateTime > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `;
};

export async function getRelatedInputs(transactionId: number): Promise<BaseTransactionEvent[]> {
  const [ibtsError, ibts] = await exec(
    getManager('db_sync').getRepository<InputBaseTransaction>('input_base_transactions').createQueryBuilder().where({ transactionId }).getMany(),
  );
  if (ibtsError) throw ibtsError;

  return ibts.map(ibt => {
    return { name: BaseTransactionName.INPUT, addressHash: ibt.addressHash };
  });
}
