import { Injectable, Logger } from '@nestjs/common';
import { ExplorerResponse, TokenInfoRequestDto, TokenInfoResponseDto } from 'src/dtos';
import { Currency } from 'src/entities';
import { DbAppEntitiesNames } from 'src/entities/db-app/entities.names';
import { ExplorerAppEntitiesNames, TokenEntity } from 'src/entities/explorer';

import { ExplorerBadRequestError, ExplorerError, ExplorerInternalServerError } from 'src/errors/explorer-error';
import { getManager } from 'typeorm';
import { exec } from '../utils/promise-helper';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
  private readonly logger = new Logger('TokenService');
  constructor(private readonly configService: ConfigService) {}

  async getTokenInfo(request: TokenInfoRequestDto): Promise<TokenInfoResponseDto> {
    const { currencyHash } = request;
    if (currencyHash === this.configService.get('COTI_CURRENCY_HASH')) {
      throw new ExplorerBadRequestError(`Currency with currency hash ${currencyHash} is not supported`);
    }
    const dbAppManager = getManager('db_app');
    const explorerManager = getManager();
    try {
      const currencyQuery = dbAppManager
        .getRepository<Currency>(DbAppEntitiesNames.currencies)
        .createQueryBuilder('c')
        .innerJoinAndSelect('c.originatorCurrencyData', 'ocd')
        .where({ hash: currencyHash });
      const [currencyError, currency] = await exec(currencyQuery.getOne());
      if (currencyError) {
        throw new ExplorerInternalServerError(currencyError.message);
      }
      if (!currency) {
        throw new ExplorerBadRequestError(`Currency with currency hash ${currencyHash} does not exists`);
      }

      const tokenQuery = explorerManager.getRepository<TokenEntity>(ExplorerAppEntitiesNames.tokens).createQueryBuilder('t').where({ currencyHash: currency.hash });
      const [tokenError, token] = await exec(tokenQuery.getOne());
      if (tokenError) {
        throw new ExplorerInternalServerError(tokenError.message);
      }

      const circulatingSupplyQuery = dbAppManager
        .getRepository<{ circulatingSupply: number }>(DbAppEntitiesNames.currencies)
        .createQueryBuilder('c')
        .innerJoinAndSelect('c.addressBalance', 'addressBalance')
        .select(`SUM(amount) as circulatingSupply`)
        .where({ hash: request.currencyHash });
      const [circulatingSupplyError, circulatingSupplyQueryRes] = await exec(circulatingSupplyQuery.getRawOne());
      if (circulatingSupplyError) {
        throw new ExplorerInternalServerError(circulatingSupplyError.message);
      }

      return new TokenInfoResponseDto(currency, token, circulatingSupplyQueryRes.circulatingSupply);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }
}
