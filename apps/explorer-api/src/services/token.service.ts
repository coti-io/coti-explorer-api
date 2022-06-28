import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  CreateTokenInfoRequestDto,
  Currency,
  DbAppEntitiesNames,
  exec,
  ExplorerAppEntitiesNames,
  getTotalTgbts,
  TokenEntity,
  TokenGenerationFeeBaseTransaction,
  TokenInfoBySymbolRequestDto,
  TokenInfoRequestDto,
  TokenInfoResponseDto,
  TokenRequestDto,
  TokensInfoResponseDto,
  TokenUploadImageUrlResponseDto,
} from '@app/shared';

import { ExplorerBadRequestError, ExplorerError, ExplorerInternalServerError } from '../errors';
import { getManager, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FileUploadService } from './file-upload.service';
import { ExtendedMulterFile } from '../interceptors';
import { utils as CryptoUtils } from '@coti-io/crypto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger('TokenService');

  constructor(private readonly configService: ConfigService, private readonly fileUploadService: FileUploadService) {}

  async getTokenInfo(request: TokenInfoRequestDto): Promise<TokenInfoResponseDto> {
    const { currencyHash } = request;
    const cotiCurrencyHash = CryptoUtils.getCurrencyHashBySymbol('coti');
    if (currencyHash === cotiCurrencyHash) {
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
        .getRepository<Currency>(DbAppEntitiesNames.currencies)
        .createQueryBuilder('c')
        .innerJoinAndSelect('c.addressBalance', 'addressBalance')
        .select(`SUM(amount) as circulatingSupply`)
        .where({ hash: request.currencyHash });
      const [circulatingSupplyError, circulatingSupplyQueryRes] = await exec(circulatingSupplyQuery.getRawOne<{ circulatingSupply: string }>());
      if (circulatingSupplyError) {
        throw new ExplorerInternalServerError(circulatingSupplyError.message);
      }

      return new TokenInfoResponseDto(currency, token, circulatingSupplyQueryRes.circulatingSupply);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  async getTokenInfoBySymbol(request: TokenInfoBySymbolRequestDto): Promise<TokenInfoResponseDto> {
    try {
      const currencyHash = CryptoUtils.getCurrencyHashBySymbol(request.symbol);
      const [tokenInfoError, tokenInfo] = await exec(this.getTokenInfo({ currencyHash }));
      if (tokenInfoError) {
        throw new ExplorerInternalServerError(tokenInfoError.message);
      }

      return tokenInfo;
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  // end point for admin
  async getTokensInfo(body: TokenRequestDto): Promise<TokensInfoResponseDto> {
    const dbAppManager = getManager('db_app');
    const explorerManager = getManager();
    const { limit, offset } = body;
    try {
      const count = await getTotalTgbts(dbAppManager);
      const tgbtQuery = dbAppManager
        .getRepository<TokenGenerationFeeBaseTransaction>(DbAppEntitiesNames.tokenGenerationFeeBaseTransactions)
        .createQueryBuilder('tgbt')
        .innerJoinAndSelect('tgbt.baseTransaction', 't')
        .orderBy('t.attachmentTime')
        .limit(limit)
        .offset(offset);

      const [tgbtError, tgbt] = await exec(tgbtQuery.getMany());
      if (tgbtError) {
        throw new ExplorerInternalServerError(tgbtError.message);
      }
      const tgbtIds = tgbt.map(baseTx => baseTx.id);

      const currencyQuery = dbAppManager
        .getRepository<Currency>(DbAppEntitiesNames.currencies)
        .createQueryBuilder('c')
        .innerJoinAndSelect('c.originatorCurrencyData', 'ocd')
        .innerJoinAndSelect('ocd.tokenGenerationServiceData', 'tgsd')
        .innerJoinAndSelect('tgsd.tokenGenerationBaseTransaction', 'tgbt')
        .where(`tgbt.id IN (:ids)`, { ids: tgbtIds });

      const [currencyError, currencies] = await exec(currencyQuery.getMany());
      if (currencyError) {
        throw new ExplorerInternalServerError(currencyError.message);
      }

      const currencyHashes = currencies.map(c => c.hash);

      const tokenQuery = explorerManager
        .getRepository<TokenEntity>(ExplorerAppEntitiesNames.tokens)
        .createQueryBuilder('t')
        .where({ currencyHash: In(currencyHashes) });
      const [tokensError, tokens] = await exec(tokenQuery.getMany());
      if (tokensError) {
        throw new ExplorerInternalServerError(tokensError.message);
      }

      const circulatingSupplyQuery = dbAppManager
        .getRepository<Currency>(DbAppEntitiesNames.currencies)
        .createQueryBuilder('c')
        .innerJoinAndSelect(`c.addressBalance`, 'addressBalance')
        .select(`hash, SUM(amount) as circulatingSupply`)
        .where({ hash: In(currencyHashes) })
        .groupBy('hash');
      const [circulatingSupplyError, circulatingSupplyQueryRes] = await exec(circulatingSupplyQuery.getRawMany<{ hash: string; circulatingSupply: string }>());
      if (circulatingSupplyError) {
        throw new ExplorerInternalServerError(circulatingSupplyError.message);
      }
      const tokenMap = tokens.reduce((acc, cur) => {
        acc[cur.currencyHash] = cur;
        return acc;
      }, {});
      const circulatingSupplyMap = circulatingSupplyQueryRes.reduce((acc, cur) => {
        acc[cur.hash] = cur;
        return acc;
      }, {});

      const tokenInfoList = currencies.map(c => new TokenInfoResponseDto(c, tokenMap[c.hash], circulatingSupplyMap[c.hash]?.circulatingSupply));

      return {
        count,
        tokenInfoList,
      };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  // end point for admin
  async createTokenExtraDetails(params: CreateTokenInfoRequestDto): Promise<TokenInfoResponseDto> {
    const explorerManager = getManager();
    try {
      const tokensRepository = explorerManager.getRepository<TokenEntity>(ExplorerAppEntitiesNames.tokens);
      const { currencyHash } = params;
      const [tokenInfoError, tokenInfoFound] = await exec(tokensRepository.findOne({ currencyHash }));
      if (tokenInfoError) {
        throw new ExplorerInternalServerError(tokenInfoError.message);
      }
      if (tokenInfoFound) {
        const [updatedTokenError] = await exec(tokensRepository.update({ currencyHash }, params));
        if (updatedTokenError) {
          throw new ExplorerInternalServerError(updatedTokenError.message);
        }
      } else {
        const tokenInfo = tokensRepository.create({
          ...params,
        });

        const [tokensError] = await exec(tokensRepository.save(tokenInfo));
        if (tokensError) {
          throw new ExplorerInternalServerError(tokensError.message);
        }
      }

      return this.getTokenInfo({ currencyHash });
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }

  // end point for admin
  async uploadIcon(file: ExtendedMulterFile): Promise<TokenUploadImageUrlResponseDto> {
    const { hash } = file;
    const explorerManager = getManager();
    const dbAppManager = getManager('db_app');
    try {
      const currencyDataRepository = dbAppManager.getRepository<Currency>(DbAppEntitiesNames.currencies);
      const currencyQuery = currencyDataRepository.createQueryBuilder('c').innerJoinAndSelect('c.originatorCurrencyData', 'ocd').where({ hash });
      const [currencyError, currency] = await exec(currencyQuery.getOne());
      if (currencyError) {
        throw new ExplorerInternalServerError(currencyError.message);
      }
      if (!currency) {
        throw new ExplorerInternalServerError(`No currency with currencyHash ${hash}`);
      }
      const tokensRepository = explorerManager.getRepository<TokenEntity>(ExplorerAppEntitiesNames.tokens);
      const [tokenError, token] = await exec(tokensRepository.findOne({ currencyHash: hash }));
      if (tokenError) {
        throw new ExplorerInternalServerError(tokenError.message);
      }
      if (!token) {
        throw new BadRequestException(`Token info for currencyHash: ${hash} does not exits`);
      }

      const network = this.configService.get<string>('NETWORK');
      const bucketS3 = `coti-explorer-api${network === 'mainnet' || network === 'testnet' ? '' : '-dev'}`;

      const maxFileSize = this.configService.get<number>('MAX_FILE_SIZE_IN_KB');
      const aloudFileFormats = this.configService.get<string>('ALOUD_FILE_FORMATS').split(' ');
      if (file && file.size > maxFileSize * 1024) {
        throw new BadRequestException(`The file exceeded the allowed limit ${maxFileSize} KB`);
      }

      const fileType = file.mimetype?.split('/')[1];
      if (!aloudFileFormats.includes(fileType)) {
        throw new BadRequestException(`Unsupported file type: ${fileType}, upload file with type: ${aloudFileFormats.toString()}`);
      }
      const fileName = `${network}/tokens/${hash}.svg`;
      const [uploadFileError] = await exec(this.fileUploadService.uploadFile(fileName, bucketS3, file));
      if (tokenError) {
        throw new ExplorerInternalServerError(uploadFileError.message);
      }
      const iconUrl = `https://explorer-api-storage${network === 'mainnet' || network === 'testnet' ? '' : '-dev'}.coti.io/${fileName}`;
      return { iconUrl };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async uploadTest(file: ExtendedMulterFile): Promise<TokenUploadImageUrlResponseDto> {
    try {
      const network = this.configService.get<string>('NETWORK');
      const bucketS3 = `coti-explorer-api${network === 'mainnet' || network === 'testnet' ? '' : '-dev'}`;

      if (file && file.size > 1000000) {
        throw new BadRequestException(`The file exceeded the allowed limit 1MB`);
      }

      const filetType = file.mimetype?.split('/')[1];
      const aloudFileTypes = ['svg'];
      if (!aloudFileTypes.includes(filetType)) {
        throw new BadRequestException(`Unsupported file type: ${filetType}, upload file with type: ${aloudFileTypes.toString()}`);
      }
      const fileName = `${network}/tokens/test}`;
      const [uploadFileError] = await exec(this.fileUploadService.uploadFile(fileName, bucketS3, file));
      if (uploadFileError) {
        throw new ExplorerInternalServerError(uploadFileError.message);
      }
      const iconUrl = `https://explorer-api-storage${network === 'mainnet' || network === 'testnet' ? '' : '-dev'}.coti.io/${fileName}`;
      return { iconUrl };
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }
}
