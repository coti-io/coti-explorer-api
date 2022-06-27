import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager, getManager } from 'typeorm';
import { DbAppTransaction, exec, ExplorerAppEntitiesNames, TransactionConfirmationTimeResponseDto, TreasuryTotalsEntity } from '@app/shared';
import { ExplorerError } from '../../../explorer-api/src/errors';
import { AppGateway } from '../gateway';
import { SocketEvents } from './mysql-live.service';
import { ConfirmationTimeEntity } from '@app/shared/entities/explorer/confirmation-times.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CacheService {
  private readonly logger = new Logger('CacheService');
  private totalValueLock: number;
  private readonly treasuryUrl: string;

  constructor(private readonly configService: ConfigService, private appGateway: AppGateway, private httpService: HttpService) {
    this.treasuryUrl = this.configService.get<string>('TREASURY_URL');
  }

  async updateTransactionConfirmationTime(): Promise<void> {
    const manager = getManager();
    const dbAppManager = getManager('db_app');

    const [confirmationTimeError, confirmationTime] = await exec(this.getConfirmationTime(dbAppManager));
    if (confirmationTimeError) throw confirmationTimeError;

    const entity = manager.getRepository<ConfirmationTimeEntity>(ExplorerAppEntitiesNames.confirmationTimes).create({
      ...confirmationTime,
    });

    const [saveError] = await exec(manager.save(entity));
    if (saveError) throw saveError;

    await this.appGateway.sendMessageToRoom(SocketEvents.TransactionConfirmationUpdate, SocketEvents.TransactionConfirmationUpdate, confirmationTime);
  }

  async updateTreasuryTotals(): Promise<void> {
    const manager = getManager();

    const [getTotalsResError, getTotalsRes] = await exec(firstValueFrom(this.httpService.get(`${this.treasuryUrl}/get-total`)));
    if (getTotalsResError) throw getTotalsResError;

    const entity = manager.getRepository<TreasuryTotalsEntity>(ExplorerAppEntitiesNames.treasuryTotals).create(getTotalsRes.data);
    const [saveError] = await exec(manager.save(entity));

    if (saveError) throw saveError;

    await this.appGateway.sendMessageToRoom(SocketEvents.TreasuryTotalsUpdates, SocketEvents.TreasuryTotalsUpdates, getTotalsRes.data);

    return;
  }

  async getCotiPrice(): Promise<void> {
    const [getCotiPriceError, getCotiPrice] = await exec(firstValueFrom(this.httpService.get(`${this.treasuryUrl}/get-coti-price`)));
    if (getCotiPriceError) throw getCotiPriceError;

    await this.appGateway.sendMessageToRoom(SocketEvents.CotiPrice, SocketEvents.CotiPrice, getCotiPrice.data);

    return;
  }

  async getConfirmationTime(manager: EntityManager): Promise<TransactionConfirmationTimeResponseDto> {
    try {
      const query = manager
        .getRepository<DbAppTransaction>('transactions')
        .createQueryBuilder('t')
        .select(
          `
      AVG(t.transactionConsensusUpdateTime - t.attachmentTime) average, 
      MIN(t.transactionConsensusUpdateTime - t.attachmentTime) minimum,
      MAX(t.transactionConsensusUpdateTime - t.attachmentTime) maximum`,
        )
        .where(`t.type <> 'ZeroSpend' AND t.transactionConsensusUpdateTime IS NOT NULL AND t.updateTime > DATE_ADD(NOW(), INTERVAL -24 HOUR)`);
      const [confirmationStatisticError, confirmationStatistic] = await exec(query.getRawOne<TransactionConfirmationTimeResponseDto>());

      if (confirmationStatisticError) {
        throw confirmationStatisticError;
      }
      return confirmationStatistic;
    } catch (error) {
      this.logger.error(error);
      throw new ExplorerError(error);
    }
  }
}
