import { Allow, IsNotEmpty, IsString } from 'class-validator';
import { DbAppTransaction } from 'src/entities';
import { Status } from 'src/utils/http-constants';

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
  createTime: Date;
  attachmentTime: number;
  senderHash: string;
  senderTrustScore: number;
  childrenTransactionHashes: string[];
  isValid: any;
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

export type TransactionResponseDto = {
  transactionData: TransactionDto;
};

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

export type BaseTransaction = {
  hash: string;
  addressHash: string;
  amount?: number;
  createTime: Date;
  name: BaseTransactionName;
  originalAmount?: number;
};

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
