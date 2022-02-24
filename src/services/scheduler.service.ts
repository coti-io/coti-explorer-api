import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AppService } from 'src/app.service';

const runningCronMap: { [name: string]: boolean } = {};
const runningIterationsCronMap: { [name: string]: number } = {};

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger('SchedulerService');
  constructor(private schedulerRegistry: SchedulerRegistry, private appService: AppService) {}

  addCronJob(name: string, secondsExpression: string, func: any) {
    const job = new CronJob(secondsExpression, async () => {
      try {
        if (!runningCronMap[name]) {
          runningIterationsCronMap[name] = (runningIterationsCronMap[name] || 0) + 1;
          this.logger.log(`[${name} cron started][iteration ${runningIterationsCronMap[name]}]`);
          runningCronMap[name] = true;
          await func.call(this);
          runningCronMap[name] = false;
          this.logger.log(`[${name} cron ended][iteration ${runningIterationsCronMap[name]}]`);
        } else this.logger.log(`Skipping ${name} cron task [iteration ${runningIterationsCronMap[name]}]`);
      } catch (e) {
        this.logger.error(`[${name}${JSON.stringify(e)}][iteration ${runningIterationsCronMap[name]}]`);
        runningCronMap[name] = false;
      }
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.warn(`job ${name} added for each minute at ${secondsExpression} seconds!`);
  }

  deleteCron(name: string) {
    this.schedulerRegistry.deleteCronJob(name);
    this.logger.warn(`job ${name} deleted!`);
  }
}
