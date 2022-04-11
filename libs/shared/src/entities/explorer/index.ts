import { NodeEntity } from '@app/shared/entities/explorer/nodes.entity';
import { TokenEntity } from '@app/shared/entities/explorer/tokens.entity';
import { NodeWalletHashEntity } from '@app/shared/entities/explorer/node-wallet-hashes.entity';

export * from './nodes.entity';
export * from './tokens.entity';
export * from './node-wallet-hashes.entity';
export * from './entities.names';

export const ExplorerEntities = [NodeEntity, TokenEntity, NodeWalletHashEntity];
