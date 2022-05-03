import { NodeEntity } from '@app/shared/entities/explorer/nodes.entity';
import { TokenEntity } from '@app/shared/entities/explorer/tokens.entity';
import { NodeHashEntity } from '@app/shared/entities/explorer/node-hashes.entity';
import { OpenIpsEntity } from '@app/shared/entities/explorer/open-ips.entity';

export * from './nodes.entity';
export * from './tokens.entity';
export * from './node-hashes.entity';
export * from './entities.names';
export * from './open-ips.entity';

export const ExplorerEntities = [NodeEntity, TokenEntity, NodeHashEntity, OpenIpsEntity];
