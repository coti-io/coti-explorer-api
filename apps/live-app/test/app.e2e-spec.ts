import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { LiveAppModule } from './../src/live-app.module';

describe('LiveAppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LiveAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });
});
