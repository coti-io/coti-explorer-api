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

  @Column()
  amount: number;

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
  trustChainTrustScore: number;

  @Column()
  transactionConsensusUpdateTime: number;

  @Column()
  transactionDescription: string;

  @Column()
  trustChainConsensus: boolean;

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
  const [ibtsError, ibts] = await exec(getManager('db_sync').getRepository<InputBaseTransaction>('input_base_transactions').find({ transactionId }));
  if (ibtsError) throw ibtsError;

  return ibts.map(ibt => {
    return { name: BaseTransactionName.INPUT, addressHash: ibt.addressHash };
  });
}
