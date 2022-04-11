import { Module } from '@nestjs/common';
import { LiveAppController } from './live-app.controller';
import { LiveAppService } from './live-app.service';

@Module({
  imports: [],
  controllers: [LiveAppController],
  providers: [LiveAppService],
})
export class LiveAppModule {}
