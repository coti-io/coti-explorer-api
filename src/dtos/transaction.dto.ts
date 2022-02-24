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

  @Allow()
  limit: number;

  @Allow()
  offset: number;
}

export type TransactionsResponseDto = {
  status: string;
  transactionsData: TransactionDto[];
};

export type TransactionResponseDto = {
  status: string;
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
