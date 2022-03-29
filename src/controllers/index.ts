import { SearchController } from './search.controller';
import { StatisticController } from './statistic.controller';
import { TransactionController } from './transaction.controller';

export * from './transaction.controller';
export * from './statistic.controller';
export * from './search.controller';

export const controllers = [TransactionController, StatisticController, SearchController];
