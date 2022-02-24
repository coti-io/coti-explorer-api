import { Injectable, Logger } from '@nestjs/common';
@Injectable()
export class AppInitService {
  private readonly logger = new Logger('AppInitService');

  constructor() {
    this.init();
  }

  async init() {
    try {
      await this.cronJobInitialization();
    } catch (e) {
      this.logger.error(e);
      this.logger.error('Init service failed to initiate');
      process.exit(1);
    }
  }

  async cronJobInitialization() {
    // const cotiPriceFreq = this.configService.get<string>('COTI_PRICE_FREQUENCY_IN_SECONDS');
    // this.scheduler.addCronJob('COTI_PRICE_RATE_CRON', `*/${cotiPriceFreq} * * * * *`, this.scheduler.insertCotiPriceTask);
  }
}
