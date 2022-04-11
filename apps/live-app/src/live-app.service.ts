import { Injectable } from '@nestjs/common';

@Injectable()
export class LiveAppService {
  getHello(): string {
    return 'Hello World!';
  }
}
