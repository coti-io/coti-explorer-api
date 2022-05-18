import { DateYMDString } from '../types/date.type';

export class NodeManagerResponse {
  status: string;
}

export class NodeManagerRangeRequest {
  startDate: DateYMDString;
  endDate: DateYMDString;
}

export class TotalsByPercentageNodesRequest extends NodeManagerRangeRequest {
  nodeHashes: string[];
}

export class QueryNodesByHashRequest {
  nodeHash: string;
}

export class ActivationTimeResponse {}

export class NodeListResponse extends NodeManagerResponse {
  nodes: {
    TrustScoreNodes: NodeListItem[];
    FullNodes: FullnodeListItem[];
    FinancialServer: FinancialServerNodeListItem[];
  };
}
export type NodeHashToActivityPercentage = { [key: string]: { status: boolean; percentage: number } };
export class TotalsByPercentageNodesResponse extends NodeManagerResponse {
  nodeHashToActivityPercentage: NodeHashToActivityPercentage;
}

export class NodeListItem {
  nodeHash: string;
  httpAddress: string;
  url: string;
  version: string;
}

export class FullnodeListItem extends NodeListItem {
  feeData: FeeData;
  url: string;
}

export class FinancialServerNodeListItem extends NodeListItem {
  url: string;
}

export class FeeData {
  feePercentage: number;
  minimumFee: number;
  maximumFee: number;
}
