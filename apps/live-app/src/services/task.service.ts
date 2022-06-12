import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from '@app/shared';
import * as moment from 'moment';
import { NodeService } from './node.service';
import { CacheService } from './cache.service';

const iterationCounter = new Map();

@Injectable()
export class TaskService implements OnModuleInit {
  private readonly logger = new Logger('TaskService');

  constructor(private readonly configService: ConfigService, private readonly nodeService: NodeService, private readonly cacheService: CacheService) {}

  onModuleInit(): void {
    this.init();
  }

  init(): void {
    this.runEveryXSeconds('updateNodeData', this.nodeService.updateNodesData.bind(this.nodeService), 60);
    this.runEveryXSeconds('updateConfirmationTime', this.cacheService.updateTransactionConfirmationTime.bind(this.cacheService), 60);
    this.runEveryXSeconds('updateTreasuryTotals', this.cacheService.updateTreasuryTotals.bind(this.cacheService), 60);
  }

  async runEveryXSeconds<T>(name: string, functionToRun: () => Promise<T>, minIntervalInSeconds: number): Promise<void> {
    try {
      let lastActivationTime;
      iterationCounter.set(name, 1);
      this.logger.log(`[Task ${name}] [started]`);
      // noinspection InfiniteLoopJS
      while (true) {
        lastActivationTime = moment.now();
        const [error] = await exec(functionToRun());
        if (error) this.logger.error(`Task [${name}][iteration ${iterationCounter.get(name)}] [${error.message || error}]`);

        const now = moment.now();
        const timeDiffInSeconds = (now - lastActivationTime) / 1000;
        const sleepTime = minIntervalInSeconds - timeDiffInSeconds;
        if (sleepTime > 0) {
          await this.sleep(sleepTime * 1000);
        }
        this.logger.log(`Task [${name}][iteration ${iterationCounter.get(name)}] ended`);
        iterationCounter.set(name, iterationCounter.get(name) + 1);
      }
    } catch (error) {
      this.logger.error(`Task [${name}][${error.message || error}]`);
      this.logger.error(`Task [${name}][terminated]`);
    }
  }

  sleep(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
  }
}
