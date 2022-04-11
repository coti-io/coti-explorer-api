import { Controller, Get } from '@nestjs/common';
import { LiveAppService } from './live-app.service';

@Controller()
export class LiveAppController {
  constructor(private readonly liveAppService: LiveAppService) {}

  @Get()
  getHello(): string {
    return this.liveAppService.getHello();
  }
}
