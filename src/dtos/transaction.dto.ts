import { Optional } from '@nestjs/common';
import { Allow, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { BaseTransactionEntity, DbAppTransaction, FullnodeFeeBaseTransaction, InputBaseTransaction, NetworkFeeBaseTransaction, ReceiverBaseTransaction } from 'src/entities';

export class TransactionDto {
  hash: string;
  amount: number;
  type: TransactionType;
  baseTransactions: BaseTransactionDto[];
  leftParentHash: string;
  rightParentHash: string;
  trustChainConsensus: number;
  trustChainTrustScore: number;
  transactionConsensusUpdateTime: number;
  createTime: number;
  attachmentTime: number;
  senderHash: string;
  senderTrustScore: number;
  childrenTransactionHashes: string[];
  isValid: string;
  transactionDescription: string;
  index: number;
  status?: TransactionStatus;

  constructor(transaction: DbAppTransaction) {
    this.baseTransactions = [
      ...transaction.inputBaseTransactions.map(x => new InuputBaseTransactionDto(x)),
      ...transaction.receiverBaseTransactions.map(x => new ReceiverBaseTransactionDto(x)),
      ...transaction.fullnodeFeeBaseTransactions.map(x => new FullnodeFeeBaseTransactionDto(x)),
      ...transaction.networkFeeBaseTransactions.map(x => new NetworkFeeBaseTransactionDto(x)),
    ];
    this.createTime = transaction.transactionCreateTime;
    this.status = this.transactionConsensusUpdateTime ? TransactionStatus.CONFIRMED : TransactionStatus.ATTACHED_TO_DAG;
    delete transaction.id;
    delete transaction.inputBaseTransactions;
    delete transaction.receiverBaseTransactions;
    delete transaction.fullnodeFeeBaseTransactions;
    delete transaction.networkFeeBaseTransactions;
    delete transaction.transactionCreateTime;
    delete transaction.updateTime;
    delete transaction.createTime;
    Object.assign(this, transaction);
  }
}

export class GetTransactionByHashRequestDto {
  @IsString()
  @IsNotEmpty()
  transactionHash: string;
}

export class GetAddressTransactionsDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @Optional()
  @IsNumber()
  @Max(50)
  @Min(0)
  limit = 50;

  @Optional()
  @IsNumber()
  @Min(0)
  offset = 0;
}

export class GetNodeTransactionsDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @Optional()
  @IsNumber()
  @Max(50)
  @Min(0)
  limit = 50;

  @Optional()
  @IsNumber()
  @Min(0)
  offset = 0;
}
export class TransactionsResponseDto {
  @Allow()
  transactionsData: TransactionDto[];

  @IsNumber()
  totalTransactions: number;

  constructor(total: number, transactions: DbAppTransaction[]) {
    this.totalTransactions = total;
    this.transactionsData = transactions.map((x: DbAppTransaction) => new TransactionDto(x));
  }
}

export class TransactionResponseDto {
  transactionData: TransactionDto;
}

export enum BaseTransactionName {
  INPUT = 'IBT',
  PAYMENT_INPUT = 'PIBT',
  FULL_NODE_FEE = 'FFBT',
  NETWORK_FEE = 'NFBT',
  ROLLING_RESERVE = 'RRBT',
  RECEIVER = 'RBT',
  TOKEN_GENERATION_FEE = 'TGBT',
  TOKEN_MINT = 'TMBT',
}

export enum TransactionType {
  INITIAL = 'Initial',
  PAYMENT = 'Payment',
  TRANSFER = 'Transfer',
  ZEROSPEND = 'ZeroSpend',
  CHARGEBACK = 'Chargeback',
  TOKEN_GENERATION = 'TokenGeneration',
  TOKEN_MINTING = 'TokenMinting',
}

export class BaseTransactionDto {
  hash: string;
  addressHash: string;
  amount: number;
  createTime: number;
  name: BaseTransactionName;
  constructor(baseTransactionDto: BaseTransactionEntity, createTime: number) {
    this.hash = baseTransactionDto.hash;
    this.addressHash = baseTransactionDto.addressHash;
    this.amount = baseTransactionDto.amount;
    this.name = baseTransactionDto.name;
    this.createTime = Number(createTime);
  }
}

export class InuputBaseTransactionDto extends BaseTransactionDto {
  constructor(baseTransaction: InputBaseTransaction) {
    super(baseTransaction, baseTransaction.inputCreateTime);
  }
}

export class FullnodeFeeBaseTransactionDto extends BaseTransactionDto {
  originalAmount: number;
  constructor(baseTransaction: FullnodeFeeBaseTransaction) {
    super(baseTransaction, baseTransaction.fullnodeFeeCreateTime);
    this.originalAmount = baseTransaction.originalAmount;
  }
}

export class NetworkFeeBaseTransactionDto extends BaseTransactionDto {
  originalAmount: number;
  reducedAmount: number;
  constructor(baseTransaction: NetworkFeeBaseTransaction) {
    super(baseTransaction, baseTransaction.networkFeeCreateTime);
    this.reducedAmount = baseTransaction.reducedAmount;
    this.originalAmount = baseTransaction.originalAmount;
  }
}

export class ReceiverBaseTransactionDto extends BaseTransactionDto {
  originalAmount: number;
  receiverDescription: string;
  constructor(baseTransaction: ReceiverBaseTransaction) {
    super(baseTransaction, baseTransaction.receiverCreateTime);
    this.receiverDescription = baseTransaction.receiverDescription;
    this.originalAmount = baseTransaction.originalAmount;
  }
}

export class TransactionEventDto {
  id: number;
  attachmentTime: number;
  createTime: Date;
  type: string;
  hash: string;
  transactionConsensusUpdateTime: number;
  leftParentHash: string;
  rightParentHash: string;
  trustChainConsensus: number;
  trustChainTrustScore: number;
  senderHash: string;
  senderTrustScore: string;
  isValid: any;
  transactionDescription: string;
  amount: number;
  rbtAddressHash: string;
  rbtOriginalAmount: number;
  rbtAmount: number;
  rbtCreateTime: number;
  rbtHash: string;
  nfbtAddressHash: string;
  nfbtOriginalAmount: number;
  nfbtAmount: number;
  nfbtCreateTime: number;
  nfbtHash: string;
  ffbtAddressHash: string;
  ffbtOriginalAmount: number;
  ffbtAmount: number;
  ffbtCreateTime: number;
  ffbtHash: string;

  constructor(transactionEventDto: TransactionEventDto) {
    Object.assign(transactionEventDto);
  }
}

type TransactionData = {
  createTime: Date;
  attachmentTime: Date;
  type: string;
  hash: string;
  transactionConsensusUpdateTime: number;
  amount: number;
  leftParentHash: string;
  rightParentHash: string;
  trustChainConsensus: number;
  trustChainTrustScore: number;
  senderHash: string;
  senderTrustScore: string;
  isValid: any;
  baseTransactions: BaseTransactionEvent[];
  transactionDescription: string;
};

export class TransactionMessageDto {
  status: TransactionStatus;
  transactionData: TransactionData;

  constructor(transactionEventDto: TransactionEventDto) {
    Object.assign(transactionEventDto);
  }
}

export enum TransactionStatus {
  CONFIRMED = 'CONFIRMED',
  ATTACHED_TO_DAG = 'ATTACHED_TO_DAG',
}

export type BaseTransactionEvent = {
  name: BaseTransactionName;
  amount?: number;
  addressHash?: string;
};
