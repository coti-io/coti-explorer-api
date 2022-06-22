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
import { EntityManager, getManager, In, Not } from 'typeorm';

@Injectable()
export class SearchService {
  private readonly logger = new Logger('SearchService');

  async getSearchResults(searchString: string): Promise<SearchResponseDto> {
    const promisesArr = [];
    const dbAppManager = getManager('db_app');
    const explorerManager = getManager();
    try {
      promisesArr.push(this.getTokenHashMap(searchString, dbAppManager, explorerManager));
      promisesArr.push(this.getNodesData(searchString, explorerManager));
      promisesArr.push(this.getAddressesHashArray(searchString, dbAppManager));
      promisesArr.push(this.getTransactionsHashArray(searchString, dbAppManager));

      const results: PromiseSettledResult<PromiseFulfilledResult<any> | PromiseRejectedResult>[] = await Promise.allSettled(promisesArr);
      const successResults = results.filter(promise => promise.status === 'fulfilled') as PromiseFulfilledResult<any>[];

      if (successResults.length != results.length) {
        throw results.find(pVal => pVal.status === 'rejected');
      }

      return {
        tokens: successResults[0].value.currencies.map(c => new TokenSearchResult(c, successResults[0].value.hashToTokenMap[c.hash])).slice(0, 5),
        nodes: successResults[1].value.map(n => new NodeSearchResult(n)).slice(0, 5),
        addresses: successResults[2].value,
        transactions: successResults[3].value,
      };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError({
        message: error.message,
      });
    }
  }

  async getTokenHashMap(searchString: string, dbAppManager: EntityManager, explorerManager: EntityManager): Promise<any> {
    const currencyQuery = dbAppManager
      .getRepository<Currency>(DbAppEntitiesNames.currencies)
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.originatorCurrencyData', 'ocd')
      .where('ocd.name like :name', { name: `%${searchString}%` })
      .orWhere('ocd.symbol like :symbol', { symbol: `%${searchString}%` })
      .orWhere('c.hash like :hash', { hash: `${searchString}%` });

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

    return {
      currencies,
      hashToTokenMap,
    };
  }

  async getNodesData(searchString: string, explorerManager: EntityManager): Promise<any> {
    const nodeQuery = explorerManager
      .getRepository<NodeEntity>(ExplorerAppEntitiesNames.nodes)
      .createQueryBuilder('n')
      .where('n.name like :name', { name: `%${searchString}%` });
    const [nodesDatasError, nodes] = await exec(nodeQuery.getMany());
    if (nodesDatasError) {
      throw nodesDatasError;
    }

    return nodes;
  }

  async getAddressesHashArray(searchString: string, dbAppManager: EntityManager): Promise<any> {
    const addressQuery = dbAppManager
      .getRepository<Addresses>(DbAppEntitiesNames.addresses)
      .createQueryBuilder('a')
      .where('a.addressHash like :addressHash', { addressHash: `${searchString}%` })
      .limit(5);
    const [addressesDataError, addressesData] = await exec(addressQuery.getMany());
    if (addressesDataError) {
      throw addressesDataError;
    }

    return addressesData.map(x => x.addressHash);
  }

  async getTransactionsHashArray(searchString: string, dbAppManager: EntityManager) {
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

    return transactionsData.map(x => x.hash);
  }
}
