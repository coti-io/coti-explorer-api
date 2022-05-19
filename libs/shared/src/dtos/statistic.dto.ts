export class WalletCountResponseDto {
  walletCount: number;
}

export class TransactionConfirmationTimeResponseDto {
  avg: number;
  min: number;
  max: number;
}

export class TreasuryTotalsResponseDto {
  totalCotiInPool: string;
  totalUnlocked: string;
  totalUnlockedUsd: string;
  totalLevragedCoti: string;
  tvl: string;
  maxApy: string;
}
