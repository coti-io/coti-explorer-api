import { Injectable, Logger } from '@nestjs/common';
import {
  Addresses,
  Currency,
  DbAppEntitiesNames,
  DbAppTransaction,
  exec,
  ExplorerAppEntitiesNames,
  NodeEntity,
  NodeSearchResult,
  SearchResponseDto,
  TokenEntity,
  TokenSearchResult,
  TransactionType,
} from '@app/shared';

import { ExplorerError } from '../errors';
import { getManager, In, Not } from 'typeorm';

@Injectable()
export class SearchService {
  private readonly logger = new Logger('SearchService');

  async getSearchResults(searchString: string): Promise<SearchResponseDto> {
    const dbAppManager = getManager('db_app');
    const explorerManager = getManager();
    try {
      // Tokens
      const currencyQuery = dbAppManager
        .getRepository<Currency>(DbAppEntitiesNames.currencies)
        .createQueryBuilder('c')
        .innerJoinAndSelect('c.originatorCurrencyData', 'ocd')
        .where('ocd.name like :name', { name: `%${searchString}%` })
        .orWhere('ocd.symbol like :symbol', { symbol: `%${searchString}%` })
        .orWhere('c.hash like :hash', { hash: `%${searchString}%` });

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
        return acc;
      }, {});

      // Nodes
      const nodeQuery = explorerManager
        .getRepository<NodeEntity>(ExplorerAppEntitiesNames.nodes)
        .createQueryBuilder('n')
        .where('n.name like :name', { name: `%${searchString}%` });
      const [nodesDatasError, nodes] = await exec(nodeQuery.getMany());
      if (nodesDatasError) {
        throw nodesDatasError;
      }

      // Addresses
      const addressQuery = dbAppManager
        .getRepository<Addresses>(DbAppEntitiesNames.addresses)
        .createQueryBuilder('a')
        .where('a.addressHash like :addressHash', { addressHash: `${searchString}%` })
        .limit(5);
      const [addressesDataError, addressesData] = await exec(addressQuery.getMany());
      if (addressesDataError) {
        throw addressesDataError;
      }

      const addressesHashArray = addressesData.map(x => x.addressHash);

      // Transactions
      const transactionsQuery = dbAppManager
        .getRepository<DbAppTransaction>(DbAppEntitiesNames.transactions)
        .createQueryBuilder('t')
        .where('t.hash like :hash', { hash: `${searchString}%` })
        .andWhere({ type: Not(TransactionType.ZEROSPEND) })
        .limit(5);
      const [transactionsDataError, transactionsData] = await exec(transactionsQuery.getMany());
      if (transactionsDataError) {
        throw transactionsDataError;
      }

      const transactionsHashArray = transactionsData.map(x => x.hash);

      return {
        nodes: nodes.map(n => new NodeSearchResult(n)).slice(0, 5),
        tokens: currencies.map(c => new TokenSearchResult(c, hashToTokenMap[c.hash])).slice(0, 5),
        addresses: addressesHashArray,
        transactions: transactionsHashArray,
      };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError({
        message: error.message,
      });
    }
  }
}
