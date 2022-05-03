import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { uuid } from 'uuidv4';
import {
  TokenInfoRequestDto,
  TokenInfoResponseDto,
  Currency,
  DbAppEntitiesNames,
  ExplorerAppEntitiesNames,
  TokenEntity,
  exec,
  TokenUploadImageUrlResponseDto,
  CreateTokenInfoRequestDto,
} from '@app/shared';

import { ExplorerBadRequestError, ExplorerError, ExplorerInternalServerError } from '../errors';
import { getManager, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FileUploadService } from './file-upload.service';
import { ExtendedMulterFile } from '../interceptors';

@Injectable()
export class TokenService {
  private readonly logger = new Logger('TokenService');
  constructor(private readonly configService: ConfigService, private readonly fileUploadService: FileUploadService) {}

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
  // end point for admin
  async getTokensInfo(): Promise<TokenInfoResponseDto[]> {
    const dbAppManager = getManager('db_app');
    const explorerManager = getManager();
    try {
      const currencyQuery = dbAppManager.getRepository<Currency>(DbAppEntitiesNames.currencies).createQueryBuilder('c').innerJoinAndSelect('c.originatorCurrencyData', 'ocd');
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
      const [circulatingSupplyError, circulatingSupplyQueryRes] = await exec(circulatingSupplyQuery.getRawMany<{ hash: string; circulatingSupply: number }>());
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

      return currencies.map(c => new TokenInfoResponseDto(c, tokenMap[c.hash], circulatingSupplyMap[c.hash]?.circulatingSupply));
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
      const [tokenInfoError, tokenInfoFound] = await exec(tokensRepository.findOne({ currencyHash: params.currencyHash }));
      if (tokenInfoError) {
        throw new ExplorerInternalServerError(tokenInfoError.message);
      }
      if (tokenInfoFound) {
        throw new BadRequestException(`A DB entity for currency hash: ${params.currencyHash} already exists`);
      }
      const tokenInfo = tokensRepository.create({
        ...params,
      });

      const [tokensError, token] = await exec(tokensRepository.save(tokenInfo));
      if (tokensError) {
        throw new ExplorerInternalServerError(tokensError.message);
      }

      return this.getTokenInfo({ currencyHash: token.currencyHash });
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
      const tokensRepository = explorerManager.getRepository<TokenEntity>(ExplorerAppEntitiesNames.tokens);
      const currencyDataRepository = dbAppManager.getRepository<Currency>(DbAppEntitiesNames.currencies);
      const [tokenError, token] = await exec(tokensRepository.findOne({ currencyHash: hash }));
      if (tokenError) {
        throw new ExplorerInternalServerError(tokenError.message);
      }
      if (!token) {
        throw new BadRequestException(`Token with currencyHash: ${hash} does not exits`);
      }
      const currencyQuery = currencyDataRepository.createQueryBuilder('c').innerJoinAndSelect('c.originatorCurrencyData', 'ocd').where({ hash: token.currencyHash });
      const [currencyError, currency] = await exec(currencyQuery.getOne());
      if (currencyError) {
        throw new ExplorerInternalServerError(currencyError.message);
      }
      if (!currency) {
        throw new ExplorerInternalServerError(`No currency with currencyHash ${token.currencyHash}`);
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
      throw new ExplorerError(error);
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
