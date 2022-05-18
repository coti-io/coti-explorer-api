import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { FullnodeListItem, NodeHashToActivityPercentage, NodeListResponse, TotalsByPercentageNodesRequest, TotalsByPercentageNodesResponse } from '../dtos/node.dto';
import { getManager } from 'typeorm';
import { exec, ExplorerAppEntitiesNames, NodeEntity } from '@app/shared';
import { ExplorerInternalServerError } from '../../../explorer-api/src/errors';
import moment from 'moment';
import { DateYMDString } from '../types/date.type';

@Injectable()
export class NodeService {
  private readonly logger = new Logger('TaskService');
  private readonly nodeManagerUrl: string;
  constructor(private readonly configService: ConfigService, private httpService: HttpService) {
    this.nodeManagerUrl = this.configService.get('NODE_MANAGER_URL');
  }

  async updateNodesData(): Promise<void> {
    try {
      // get all the nodes to work on from db
      const manager = getManager();
      const nodeRepository = manager.getRepository<NodeEntity>(ExplorerAppEntitiesNames.nodes);
      const nodeQuery = nodeRepository.createQueryBuilder('n').innerJoinAndSelect('n.nodeHashes', 'nh');
      const [nodesError, nodes] = await exec(nodeQuery.getMany());
      if (nodesError) {
        throw new ExplorerInternalServerError(nodesError.message);
      }
      if (!nodes.length) {
        return;
      }
      const nodeHashList = nodes.map(n => n.nodeHashes.find(nh => nh.isActive).hash);
      const [nodeListError, nodeList] = await exec(this.getNodeList());
      if (nodeListError) {
        throw new ExplorerInternalServerError(nodeListError.message);
      }

      const [totalsByPercentageError, totalsByPercentage] = await exec(this.getTotalsByPercentage(nodeHashList));
      if (totalsByPercentageError) {
        throw new ExplorerInternalServerError(totalsByPercentageError.message);
      }

      // get data for each node

      for (const node of nodes) {
        const nodeHash = node.nodeHashes.find(nh => nh.isActive).hash;

        const fullNodeItemList: FullnodeListItem = nodeList.data.nodes.FullNodes.find(n => n.nodeHash === nodeHash);
        if (!fullNodeItemList) {
          this.logger.warn(`We monitor node with hash ${nodeHash} that does not exists in node manager`);
          continue;
        }
        node.maximumFee = fullNodeItemList.feeData.maximumFee.toString();
        node.minimumFee = fullNodeItemList.feeData.minimumFee.toString();
        node.feePercentage = fullNodeItemList.feeData.feePercentage.toString();
        node.version = fullNodeItemList.version;
        node.uptimeToday = totalsByPercentage.today[nodeHash]?.percentage.toString() || '0';
        node.uptimeLast7Days = totalsByPercentage.sevenDays[nodeHash]?.percentage.toString() || '0';
        node.uptimeLast14Days = totalsByPercentage.sevenDays[nodeHash]?.percentage.toString() || '0';
        node.uptimeLast30Days = totalsByPercentage.sevenDays[nodeHash]?.percentage.toString() || '0';
      }
      await nodeRepository.save(nodes);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async getTotalsByPercentage(hashList: string[]): Promise<{
    today: NodeHashToActivityPercentage;
    sevenDays: NodeHashToActivityPercentage;
    fourteenDays: NodeHashToActivityPercentage;
    thirtyDays: NodeHashToActivityPercentage;
  }> {
    const nowDate: DateYMDString = moment().format('YYYY-MM-DD') as DateYMDString;
    const sevenDaysAgoDate: DateYMDString = moment().add(7, 'days').format('YYYY-MM-DD') as DateYMDString;
    const fourteenDaysAgoDate: DateYMDString = moment().add(14, 'days').format('YYYY-MM-DD') as DateYMDString;
    const thirtyDaysAgoDate: DateYMDString = moment().add(30, 'days').format('YYYY-MM-DD') as DateYMDString;
    const today = await this.totalsByPercentageNodes({ nodeHashes: hashList, startDate: nowDate, endDate: nowDate });
    const sevenDays = await this.totalsByPercentageNodes({ nodeHashes: hashList, startDate: sevenDaysAgoDate, endDate: nowDate });
    const fourteenDays = await this.totalsByPercentageNodes({ nodeHashes: hashList, startDate: fourteenDaysAgoDate, endDate: nowDate });
    const thirtyDays = await this.totalsByPercentageNodes({ nodeHashes: hashList, startDate: thirtyDaysAgoDate, endDate: nowDate });
    return {
      today: today.data.nodeHashToActivityPercentage,
      sevenDays: sevenDays.data.nodeHashToActivityPercentage,
      fourteenDays: fourteenDays.data.nodeHashToActivityPercentage,
      thirtyDays: thirtyDays.data.nodeHashToActivityPercentage,
    };
  }

  getNodeList(): Promise<AxiosResponse<NodeListResponse>> {
    return firstValueFrom(this.httpService.get(`${this.nodeManagerUrl}/wallet/nodes`));
  }

  totalsByPercentageNodes(body: TotalsByPercentageNodesRequest): Promise<AxiosResponse<TotalsByPercentageNodesResponse>> {
    return firstValueFrom(this.httpService.post(`${this.nodeManagerUrl}/statistics/totalsByPercentageNodes`, body));
  }
}
