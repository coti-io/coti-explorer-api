import { dbAppInit, explorerDbInit, validate } from './utils';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppGateway } from './gateway';
import { services } from './services';
import { controllers } from './controllers';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [validate(), HttpModule, dbAppInit(), explorerDbInit(), ScheduleModule.forRoot()],
  controllers: [...controllers],
  providers: [ConfigService, AppGateway, ...services],
})
export class AppModule {}
