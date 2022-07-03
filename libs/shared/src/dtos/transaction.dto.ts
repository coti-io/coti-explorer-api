import { Optional } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import {
  CurrencyTypeData,
  DbAppTransaction,
  FullnodeFeeBaseTransaction,
  InputBaseTransaction,
  NetworkFeeBaseTransaction,
  OriginatorCurrencyData,
  ReceiverBaseTransaction,
  TokenGenerationFeeBaseTransaction,
  TokenGenerationServiceData,
  TokenMintingFeeBaseTransaction,
  TokenMintingServiceData,
} from '../entities';
import { BaseTransactionEntity } from './../entities/db-app/base-transaction.entity';

export type TokenBalances = { [key: string]: { symbol: string; balance: string } };

export class TransactionDto {
  hash: string;
  amount: string;
  type: TransactionType;
  baseTransactions: BaseTransactionDto[];
  leftParentHash: string;
  rightParentHash: string;
  trustChainConsensus: string;
  trustChainTrustScore: number;
  transactionConsensusUpdateTime: string;
  createTime: string;
  attachmentTime: string;
  senderHash: string;
  senderTrustScore: number;
  childrenTransactionHashes: string[];
  isValid: string;
  transactionDescription: string;
  index: number;
  status?: TransactionStatus;

  constructor(transaction: DbAppTransaction, currencySymbolMap: { [key: string]: string }) {
    this.baseTransactions = [
      ...transaction.inputBaseTransactions.map(x => new InputBaseTransactionDto(x, currencySymbolMap)),
      ...transaction.receiverBaseTransactions.map(x => new ReceiverBaseTransactionDto(x, currencySymbolMap)),
      ...transaction.fullnodeFeeBaseTransactions.map(x => new FullnodeFeeBaseTransactionDto(x, currencySymbolMap)),
      ...transaction.networkFeeBaseTransactions.map(x => new NetworkFeeBaseTransactionDto(x, currencySymbolMap)),
      ...transaction.tokenMintingFeeBaseTransactions.map(x => new TokenMintingFeeBaseTransactionDto(x, currencySymbolMap)),
      ...transaction.tokenGenerationFeeBaseTransactions.map(x => new TokenGenerationFeeBaseTransactionDto(x, currencySymbolMap)),
    ];
    this.createTime = transaction.transactionCreateTime;
    this.status = transaction.transactionConsensusUpdateTime ? TransactionStatus.CONFIRMED : TransactionStatus.ATTACHED_TO_DAG;
    delete transaction.id;
    delete transaction.inputBaseTransactions;
    delete transaction.receiverBaseTransactions;
    delete transaction.fullnodeFeeBaseTransactions;
    delete transaction.networkFeeBaseTransactions;
    delete transaction.tokenMintingFeeBaseTransactions;
    delete transaction.tokenGenerationFeeBaseTransactions;
    delete transaction.transactionCreateTime;
    delete transaction.updateTime;
    delete transaction.createTime;
    Object.assign(this, transaction);
  }
}

export class TransactionRequestDto {
  @Optional()
  @IsNumber()
  @Max(50)
  @Min(1)
  limit = 50;

  @Optional()
  @IsNumber()
  @Min(0)
  offset = 0;
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
  nodeHash: string;

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

export class GetTokenTransactionsDto {
  @IsString()
  @IsNotEmpty()
  currencyHash: string;

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
  transactionsData: TransactionDto[];
  totalTransactions: number;
  tokensSymbols: { [key: string]: string };

  constructor(total: number, transactions: DbAppTransaction[], tokensSymbols: { [key: string]: string }) {
    this.totalTransactions = total;
    this.transactionsData = transactions.map((x: DbAppTransaction) => new TransactionDto(x, tokensSymbols));
    this.tokensSymbols = tokensSymbols;
  }
}

export class AddressesTransactionsResponseDto {
  nativeBalance: string;
  tokensData: TokenBalances;
  transactionsData: TransactionDto[];
  totalTransactions: number;

  constructor(total: number, transactions: DbAppTransaction[], tokensSymbols: { [key: string]: string }, tokens: TokenBalances, nativeBalance: string) {
    this.totalTransactions = total;
    this.transactionsData = transactions.map((x: DbAppTransaction) => new TransactionDto(x, tokensSymbols));
    this.tokensData = tokens;
    this.nativeBalance = nativeBalance;
  }
}

export class NodeTransactionsResponseDto {
  transactionsData: TransactionDto[];
  totalTransactions: number;
  tokensSymbols: { [key: string]: string };

  constructor(transactions: DbAppTransaction[], tokensSymbols: { [key: string]: string }) {
    this.transactionsData = transactions.map((x: DbAppTransaction) => new TransactionDto(x, tokensSymbols));
    this.tokensSymbols = tokensSymbols;
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
  amount: string;
  createTime: string;
  name: BaseTransactionName;
  symbol: string;
  currencyHash: string;

  constructor(baseTransactionEntity: BaseTransactionEntity, createTime: string, currencySymbolMap: { [key: string]: string }) {
    this.hash = baseTransactionEntity.hash;
    this.addressHash = baseTransactionEntity.addressHash;
    this.amount = baseTransactionEntity.amount;
    this.name = baseTransactionEntity.name;
    this.createTime = createTime;
    this.symbol = currencySymbolMap[baseTransactionEntity.currencyHash];
    this.currencyHash = baseTransactionEntity.currencyHash;
  }
}

export class InputBaseTransactionDto extends BaseTransactionDto {
  constructor(baseTransaction: InputBaseTransaction, currencySymbolMap: { [key: string]: string }) {
    super(baseTransaction, baseTransaction.inputCreateTime, currencySymbolMap);
  }
}

export class FullnodeFeeBaseTransactionDto extends BaseTransactionDto {
  originalAmount: string;
  originalCurrencyHash: string;

  constructor(baseTransaction: FullnodeFeeBaseTransaction, currencySymbolMap: { [key: string]: string }) {
    super(baseTransaction, baseTransaction.fullnodeFeeCreateTime, currencySymbolMap);
    this.originalAmount = baseTransaction.originalAmount;
    this.originalCurrencyHash = baseTransaction.originalCurrencyHash;
  }
}

export class NetworkFeeBaseTransactionDto extends BaseTransactionDto {
  originalAmount: string;
  reducedAmount: string;
  originalCurrencyHash: string;

  constructor(baseTransaction: NetworkFeeBaseTransaction, currencySymbolMap: { [key: string]: string }) {
    super(baseTransaction, baseTransaction.networkFeeCreateTime, currencySymbolMap);
    this.reducedAmount = baseTransaction.reducedAmount;
    this.originalAmount = baseTransaction.originalAmount;
    this.originalCurrencyHash = baseTransaction.originalCurrencyHash;
  }
}

export class ReceiverBaseTransactionDto extends BaseTransactionDto {
  originalAmount: string;
  receiverDescription: string;
  originalCurrencyHash: string;

  constructor(baseTransaction: ReceiverBaseTransaction, currencySymbolMap: { [key: string]: string }) {
    super(baseTransaction, baseTransaction.receiverCreateTime, currencySymbolMap);
    this.receiverDescription = baseTransaction.receiverDescription;
    this.originalAmount = baseTransaction.originalAmount;
    this.originalCurrencyHash = baseTransaction.originalCurrencyHash;
  }
}

export class TokenMintingFeeBaseTransactionDto extends BaseTransactionDto {
  originalAmount: string;
  originalCurrencyHash: string;
  tokenMintingServiceData: TokenMintingServiceDataDto;

  constructor(baseTransaction: TokenMintingFeeBaseTransaction, currencySymbolMap: { [key: string]: string }) {
    super(baseTransaction, baseTransaction.tokenMintingFeeCreateTime, currencySymbolMap);
    this.originalAmount = baseTransaction.originalAmount;
    this.originalCurrencyHash = baseTransaction.originalCurrencyHash;
    this.tokenMintingServiceData = new TokenMintingServiceDataDto(baseTransaction.tokenMintingServiceData);
  }
}

export class TokenMintingServiceDataDto {
  mintingCurrencyHash: string;
  mintingAmount: string;
  receiverAddress: string;
  createTime: string;
  feeAmount: string;
  signerHash: string;

  constructor(serviceData: TokenMintingServiceData) {
    this.mintingCurrencyHash = serviceData.mintingCurrencyHash;
    this.mintingAmount = serviceData.mintingAmount;
    this.receiverAddress = serviceData.receiverAddress;
    this.createTime = serviceData.serviceDataCreateTime;
    this.feeAmount = serviceData.feeAmount;
    this.signerHash = serviceData.signerHash;
  }
}

export class TokenGenerationFeeBaseTransactionDto extends BaseTransactionDto {
  originalAmount: string;
  signerHash: string;
  originalCurrencyHash: string;
  tokenGenerationServiceData: TokenGenerationServiceDataDto;

  constructor(baseTransaction: TokenGenerationFeeBaseTransaction, currencySymbolMap: { [key: string]: string }) {
    super(baseTransaction, baseTransaction.fullnodeFeeCreateTime, currencySymbolMap);
    this.originalAmount = baseTransaction.originalAmount;
    this.originalCurrencyHash = baseTransaction.originalCurrencyHash;
    this.tokenGenerationServiceData = new TokenGenerationServiceDataDto(baseTransaction.tokenGenerationServiceData);
  }
}

export class TokenGenerationServiceDataDto {
  feeAmount: string;
  originatorCurrencyData: OriginatorCurrencyDataDto;
  currencyTypeData: CurrencyTypeDataDto;

  constructor(serviceData: TokenGenerationServiceData) {
    this.feeAmount = serviceData.feeAmount;
    this.originatorCurrencyData = new OriginatorCurrencyDataDto(serviceData.originatorCurrencyData);
    this.currencyTypeData = new CurrencyTypeDataDto(serviceData.currencyTypeData);
  }
}

export class OriginatorCurrencyDataDto {
  name: string;
  symbol: string;
  totalSupply: string;
  scale: number;
  originatorHash: string;
  description: string;

  constructor(originatorCurrencyData: OriginatorCurrencyData) {
    this.name = originatorCurrencyData.name;
    this.symbol = originatorCurrencyData.symbol;
    this.totalSupply = originatorCurrencyData.totalSupply;
    this.scale = originatorCurrencyData.scale;
    this.originatorHash = originatorCurrencyData.originatorHash;
    this.description = originatorCurrencyData.description;
  }
}

export class CurrencyTypeDataDto {
  currencyType: string;
  createTime: string;
  currencyRateSourceType: string;
  rateSource: string;
  protectionModel: string;
  signerHash: string;

  constructor(currencyTypeData: CurrencyTypeData) {
    this.currencyType = currencyTypeData.currencyType;
    this.createTime = currencyTypeData.currencyTypeDataCreateTime;
    this.currencyRateSourceType = currencyTypeData.currencyRateSourceType;
    this.rateSource = currencyTypeData.rateSource;
    this.protectionModel = currencyTypeData.protectionModel;
    this.signerHash = currencyTypeData.signerHash;
  }
}

export class TransactionEventDto {
  id: number;
  attachmentTime: string;
  createTime: Date;
  type: string;
  hash: string;
  transactionConsensusUpdateTime: number;
  leftParentHash: string;
  rightParentHash: string;
  trustChainConsensus: string;
  trustChainTrustScore: number;
  senderHash: string;
  senderTrustScore: string;
  isValid: any;
  transactionDescription: string;
  amount: number;
  rbtAddressHash: string;
  rbtOriginalAmount: string;
  rbtAmount: string;
  rbtCreateTime: string;
  rbtHash: string;
  nfbtAddressHash: string;
  nfbtOriginalAmount: string;
  nfbtAmount: string;
  nfbtCreateTime: string;
  nfbtHash: string;
  ffbtAddressHash: string;
  ffbtOriginalAmount: string;
  ffbtAmount: string;
  ffbtCreateTime: string;
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

export type TransactionConfirmationEventDto = {
  average: number;
  minimum: number;
  maximum: number;
};
