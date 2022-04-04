import { Injectable, Logger } from '@nestjs/common';
import { access } from 'fs';
import { SearchRequestDto, SearchResponseDto, NodeSearchResult, TokenSearchResult } from 'src/dtos';
import { Currency, DbAppTransaction, OriginatorCurrencyData } from 'src/entities';
import { DbAppEntitiesNames } from 'src/entities/db-app/entities.names';
import { ExplorerAppEntitiesNames, NodeEntity, TokenEntity } from 'src/entities/explorer';

import { ExplorerError } from 'src/errors/explorer-error';
import { getManager, In } from 'typeorm';
import { exec } from '../utils/promise-helper';

@Injectable()
export class SearchService {
  private readonly logger = new Logger('SearchService');

  async getSearchResults(searchString: string): Promise<SearchResponseDto> {
    const dbAppManager = getManager('db_app');
    const explorerManager = getManager();
    try {
      const currencyQuery = dbAppManager
        .getRepository<Currency>(DbAppEntitiesNames.currencies)
        .createQueryBuilder('c')
        .innerJoinAndSelect('c.originatorCurrencyData', 'ocd')
        .where('ocd.name like :name', { name: `${searchString}%` })
        .orWhere('ocd.symbol like :symbol', { symbol: `${searchString}%` });
      const [currenciesError, currencies] = await exec(currencyQuery.getMany());
      if (currenciesError) {
        throw currenciesError;
      }

      const hashArray = currencies.map(x => x.hash);

      const tokenQuery = explorerManager
        .getRepository<TokenEntity>(ExplorerAppEntitiesNames.tokens)
        .createQueryBuilder('t')
        .where({ currencyHash: In(hashArray) });
      const [tokensError, tokens] = await exec(tokenQuery.getMany());
      if (tokensError) {
        throw tokensError;
      }
      const hashToTokenMap = tokens.reduce((acc, cur) => {
        acc[cur.currencyHash] = cur;
        return access;
      }, {});

      const nodeQuery = explorerManager
        .getRepository<NodeEntity>(ExplorerAppEntitiesNames.nodes)
        .createQueryBuilder('n')
        .where('n.name like :name', { name: `%${searchString}%` });
      const [nodesDatasError, nodes] = await exec(nodeQuery.getMany());
      if (nodesDatasError) {
        throw nodesDatasError;
      }

      return { nodes: nodes.map(n => new NodeSearchResult(n)), tokens: currencies.map(c => new TokenSearchResult(c, hashToTokenMap[c.hash])) };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError({
        message: error.message,
      });
    }
  }
}
