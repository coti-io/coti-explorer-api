import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { NodeListResponse, TotalsByPercentageNodesRequest, TotalsByPercentageNodesResponse } from '../dtos/node.dto';

@Injectable()
export class NodeService {
  private readonly logger = new Logger('TaskService');
  private readonly nodeManagerUrl: string;
  constructor(private readonly configService: ConfigService, private httpService: HttpService) {
    this.nodeManagerUrl = this.configService.get('NODE_MANAGER_URL');
  }

  getNodeList(): Observable<AxiosResponse<NodeListResponse>> {
    return this.httpService.get(`${this.nodeManagerUrl}/wallet/nodes`);
  }

  totalsByPercentageNodes(body: TotalsByPercentageNodesRequest): Observable<AxiosResponse<TotalsByPercentageNodesResponse>> {
    return this.httpService.post(`${this.nodeManagerUrl}/statistics/totalsByPercentageNodes`);
  }
}
