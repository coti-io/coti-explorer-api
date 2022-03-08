import { Allow, IsNotEmpty, IsString } from 'class-validator';
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
    Object.assign(this, transaction);
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

  constructor(transactionsResponseDto: TransactionsResponseDto) {
    Object.assign(transactionsResponseDto);
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
  type: string;
  hash: string;
  transactionConsensusUpdateTime: number;
  amount: number;
  receiverAddressHash: string;
  nfbtAmount: number;
  ffbtAmount: number;

  constructor(transactionEventDto: TransactionEventDto) {
    Object.assign(transactionEventDto);
  }
}

export class TransactionMessageDto {
  [transactionData: string]: {
    date: number;
    type: string;
    txHash: string;
    transactionConsensusUpdateTime: number;
    amount: number;
    baseTransactions: BaseTransactionEvent[];
  };

  constructor(transactionEventDto: TransactionEventDto) {
    Object.assign(transactionEventDto);
  }
}

export type BaseTransactionEvent = {
  name: BaseTransactionName;
  amount?: number;
  addressHash?: string;
};
