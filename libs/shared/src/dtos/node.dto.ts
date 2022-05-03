import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NodeEntity, NodeHashEntity } from '../entities/explorer';

export class NodeInfoRequestDto {
  @IsString()
  @IsNotEmpty()
  nodeHash: string;
}

export class CreateNodeInfoRequestDto {
  @IsString()
  @IsNotEmpty()
  nodeHash: string;
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsBoolean()
  @IsOptional()
  isActive?: false;
}

export class NodeUploadImageUrlResponseDto {
  iconUrl: string;
}

export class NodeInfoResponseDto {
  nodeHashes: NodeHashDto[];
  name: string;
  link: string;
  status: string;
  trustScore: string;
  feePercentage: string;
  minimumFee: string;
  maximumFee: string;
  activationTime: string;
  originalActivationTime: string;
  uptimeToday: string;
  uptimeLast7Days: string;
  uptimeLast14Days: string;
  uptimeLast30Days: string;
  version: string;

  constructor(node: NodeEntity) {
    this.name = node?.name;
    this.link = node?.link;
    this.status = node?.status;
    this.trustScore = node?.trustScore;
    this.feePercentage = node?.feePercentage;
    this.minimumFee = node?.minimumFee;
    this.maximumFee = node?.maximumFee;
    this.activationTime = node?.activationTime;
    this.originalActivationTime = node?.originalActivationTime;
    this.uptimeToday = node?.uptimeToday;
    this.uptimeLast7Days = node?.uptimeLast7Days;
    this.uptimeLast14Days = node?.uptimeLast14Days;
    this.uptimeLast30Days = node?.uptimeLast30Days;
    this.version = node?.version;
    this.nodeHashes = node?.nodeHashes?.map(n => new NodeHashDto(n));
  }
}

export class NodeHashDto {
  isActive: boolean;
  hash: string;
  constructor(nodeHash: NodeHashEntity) {
    this.hash = nodeHash.hash;
    this.isActive = nodeHash.isActive;
  }
}
