import { dbsyncInit, validate } from './utils';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppGateway } from './gateway/app.gateway';
import { TransactionService, MysqlLiveService } from './services';
import { TransactionController } from './controllers';

@Module({
  imports: [validate(), dbsyncInit(), ScheduleModule.forRoot()],
  controllers: [TransactionController],
  providers: [ConfigService, TransactionService, AppGateway, MysqlLiveService],
})
export class AppModule {}
