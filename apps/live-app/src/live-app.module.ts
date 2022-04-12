import { Module } from '@nestjs/common';
import { dbAppInit, explorerDbInit, validate } from './utils';
import { ConfigService } from '@nestjs/config';

import { AppGateway } from './gateway';
import { services } from './services';

@Module({
  imports: [validate(), dbAppInit(), explorerDbInit()],
  controllers: [],
  providers: [ConfigService, AppGateway, ...services],
})
export class LiveAppModule {}
