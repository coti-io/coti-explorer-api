import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getManager } from 'typeorm';
import { exec } from '@app/shared';
import * as moment from 'moment';

const iterationCounter = new Map();
@Injectable()
export class MysqlLiveService {
  private readonly logger = new Logger('TaskService');
  constructor(private readonly configService: ConfigService) {
    this.init();
  }

  async init(): Promise<void> {}

  async runEveryXSeconds(name: string, functionToRun: () => Promise<any>, minIntervalInSeconds: number) {
    // TODO Conevert to moment
    try {
      let lastActivationTime = moment.now();
      iterationCounter.set(name, 1);
      this.logger.log(`[Task ${name}] [started]`);
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
