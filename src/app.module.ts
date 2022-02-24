import { dbsyncInit, validate } from './utils';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [validate(), dbsyncInit(), ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [ConfigService, AppService],
})
export class AppModule {}
