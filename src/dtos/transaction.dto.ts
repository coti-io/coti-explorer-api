import { Allow, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { DbAppTransaction } from 'src/entities';

export class TransactionDto {
  hash: string;
  amount: string;
  type: TransactionType;
  baseTransactions: BaseTransaction[];
  leftParentHash: string;
  rightParentHash: string;
  trustChainConsensus: number;
  trustChainTrustScore: number;
  transactionConsensusUpdateTime: number;
  transactionCreateTime: number;
  createTime: number;
  attachmentTime: number;
  senderHash: string;
  senderTrustScore: number;
  childrenTransactionHashes: string[];
  isValid: string;
  transactionDescription: string;
  index: number;

  constructor(transaction: DbAppTransaction) {
    delete transaction.id;
    this.baseTransactions = [
      ...transaction.inputBaseTransactions,
      ...transaction.receiverBaseTransactions,
      ...transaction.fullnodeFeeBaseTransactions,
      ...transaction.networkFeeBaseTransactions,
    ];
    delete transaction.inputBaseTransactions;
    delete transaction.receiverBaseTransactions;
    delete transaction.fullnodeFeeBaseTransactions;
    delete transaction.networkFeeBaseTransactions;
    Object.assign(this, transaction);
    this.createTime = Number(transaction.createTime.getTime());
    this.attachmentTime = Number(transaction.attachmentTime);
    this.transactionCreateTime = Number(transaction.transactionCreateTime);
    this.transactionConsensusUpdateTime = Number(transaction.transactionConsensusUpdateTime);
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

export class BaseTransaction {
  hash: string;
  addressHash: string;
  amount?: number;
  createTime: Date;
  name: BaseTransactionName;
  originalAmount?: number;
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

type TranscationData = {
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
  transactionData: TranscationData;

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
