import { Module } from '@nestjs/common';
import { dbAppInit, explorerDbInit, validate } from './utils';
import { ConfigService } from '@nestjs/config';

import { AppGateway } from './gateway';
import { services } from './services';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [validate(), HttpModule, dbAppInit(), explorerDbInit(), explorerDbInit()],
  controllers: [],
  providers: [ConfigService, AppGateway, ...services],
})
export class LiveAppModule {}
