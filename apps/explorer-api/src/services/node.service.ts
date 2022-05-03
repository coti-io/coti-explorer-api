import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import {
  ExplorerAppEntitiesNames,
  exec,
  NodeEntity,
  NodeInfoRequestDto,
  NodeInfoResponseDto,
  CreateNodeInfoRequestDto,
  NodeHashEntity,
  NodeUploadImageUrlResponseDto,
} from '@app/shared';

import { ExplorerBadRequestError, ExplorerError, ExplorerInternalServerError } from '../errors';
import { getManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FileUploadService } from './file-upload.service';
import { ExtendedMulterFile } from '../interceptors';

@Injectable()
export class NodeService {
  private readonly logger = new Logger('NodeService');
  constructor(private readonly configService: ConfigService, private readonly fileUploadService: FileUploadService) {}

  async getInfo(request: NodeInfoRequestDto): Promise<NodeInfoResponseDto> {
    const { nodeHash } = request;
    const explorerManager = getManager();
    try {
      const nodeQuery = explorerManager
        .getRepository<NodeEntity>(ExplorerAppEntitiesNames.nodes)
        .createQueryBuilder('n')
        .innerJoinAndSelect('n.nodeHashes', 'nh')
        .where(`nh.hash = :nodeHash`, { nodeHash });
      const [nodeError, node] = await exec(nodeQuery.getOne());
      if (nodeError) {
        throw new ExplorerInternalServerError(nodeError.message);
      }
      if (!node) {
        throw new ExplorerBadRequestError(`Node with nodeHash ${nodeHash} does not exists`);
      }

      return new NodeInfoResponseDto(node);
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }
  // end point for admin
  async getInfos(): Promise<NodeInfoResponseDto[]> {
    const explorerManager = getManager();
    try {
      const nodesRepository = explorerManager.getRepository<NodeEntity>(ExplorerAppEntitiesNames.nodes);
      const nodeQuery = nodesRepository.createQueryBuilder('n').innerJoinAndSelect('n.nodeHashes', 'nh');
      const [nodeError, nodes] = await exec(nodeQuery.getMany());
      if (nodeError) {
        throw new ExplorerInternalServerError(nodeError.message);
      }

      return nodes.map(n => new NodeInfoResponseDto(n));
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }
  // end point for admin
  async updateNodeExtraDetails(params: CreateNodeInfoRequestDto): Promise<NodeInfoResponseDto> {
    const explorerManager = getManager();
    try {
      const { nodeHash, name, isActive } = params;
      const nodeHashesRepository = explorerManager.getRepository<NodeHashEntity>(ExplorerAppEntitiesNames.nodeHashes);
      const nodesRepository = explorerManager.getRepository<NodeEntity>(ExplorerAppEntitiesNames.nodes);
      const [nodeHashFoundError, nodeHashFound] = await exec(nodeHashesRepository.findOne({ hash: nodeHash }));
      if (nodeHashFoundError) {
        throw new ExplorerInternalServerError(nodeHashFoundError.message);
      }

      const [nodeFoundError, nodeFound] = await exec(nodesRepository.findOne({ name }));
      if (nodeFoundError) {
        throw new ExplorerInternalServerError(nodeFoundError.message);
      }
      let node = nodeFound;
      // if we didn't have node data with this name create it
      if (!nodeFound) {
        const nodeInfo = nodesRepository.create({
          name,
        });
        const [nodeError, nodeCreated] = await exec(nodesRepository.save(nodeInfo));
        if (nodeError) {
          throw new ExplorerInternalServerError(nodeError.message);
        }
        node = nodeCreated;
      }

      if (isActive && nodeFound) {
        const [updateError] = await exec(nodeHashesRepository.update({ nodeId: node.id }, { isActive: false }));
        if (updateError) {
          throw new ExplorerInternalServerError(updateError.message);
        }
      }

      if (!nodeHash) {
        const newNodeHash = nodeHashesRepository.create({
          hash: nodeHash,
          nodeId: node.id,
          isActive,
        });

        const [nodeHashEntityError] = await exec(nodeHashesRepository.save(newNodeHash));
        if (nodeHashEntityError) {
          throw new ExplorerInternalServerError(nodeHashEntityError.message);
        }
      } else {
        nodeHashFound.nodeId = nodeFound.id;
        const [nodeHashEntityError] = await exec(nodeHashesRepository.save(nodeHashFound));
        if (nodeHashEntityError) {
          throw new ExplorerInternalServerError(nodeHashEntityError.message);
        }
      }

      return this.getInfo({ nodeHash });
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }
  // end point for admin
  async uploadIcon(file: ExtendedMulterFile): Promise<NodeUploadImageUrlResponseDto> {
    const { hash } = file;
    const explorerManager = getManager();
    try {
      const nodeQuery = explorerManager
        .getRepository<NodeEntity>(ExplorerAppEntitiesNames.nodes)
        .createQueryBuilder('n')
        .innerJoinAndSelect('n.nodeHashes', 'nh')
        .where(`nh.hash = :hash`, { hash });
      const [nodeError, node] = await exec(nodeQuery.getOne());
      if (nodeError) {
        throw new ExplorerInternalServerError(nodeError.message);
      }
      if (!node) {
        throw new ExplorerBadRequestError(`Node with nodeHash ${hash} does not exists`);
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
      const fileName = `${network}/nodes/${hash}.svg`;
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
