import { SearchController } from './search.controller';
import { StatisticController } from './statistic.controller';
import { TransactionController } from './transaction.controller';
import { TokenController } from './token.controller';
import { NodeController } from './node.controller';

export * from './transaction.controller';
export * from './statistic.controller';
export * from './search.controller';
export * from './token.controller';
export * from './node.controller';

export const controllers = [TransactionController, StatisticController, SearchController, TokenController, NodeController];
