export class WalletCountResponseDto {
  walletCount: number;
}

export class TransactionConfirmationTimeResponseDto {
  average: number;
  minimum: number;
  maximum: number;
}

export class TreasuryTotalsResponseDto {
  totalCotiInPool: string;
  totalUnlocked: string;
  totalUnlockedUsd: string;
  totalLevragedCoti: string;
  tvl: string;
  maxApy: string;
}
