import { TransactionType } from 'src/dtos/transaction.dto';
import { Column, Entity, OneToMany } from 'typeorm';
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

  @Column('double')
  attachmentTime: number;

  @Column()
  isValid: string;

  @Column('double')
  transactionCreateTime: number;

  @Column()
  leftParentHash: string;

  @Column()
  rightParentHash: string;

  @Column()
  senderHash: string;

  @Column('double')
  senderTrustScore: number;

  @Column('double')
  transactionConsensusUpdateTime: number;

  @Column()
  transactionDescription: string;

  @Column('double')
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
