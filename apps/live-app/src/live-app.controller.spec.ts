import { Test, TestingModule } from '@nestjs/testing';
import { LiveAppController } from './live-app.controller';
import { LiveAppService } from './live-app.service';

describe('LiveAppController', () => {
  let liveAppController: LiveAppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [LiveAppController],
      providers: [LiveAppService],
    }).compile();

    liveAppController = app.get<LiveAppController>(LiveAppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(liveAppController.getHello()).toBe('Hello World!');
    });
  });
});
