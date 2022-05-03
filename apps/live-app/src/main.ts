import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { LiveAppModule } from './live-app.module';
import { appModuleConfig } from './configurations';
import { RedisIoAdapter } from './redis-io-adapter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(LiveAppModule, appModuleConfig);
  const config = new DocumentBuilder().setTitle('Explorer API Live').setVersion('1.0').build();
  app.enableCors();
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  const redisIoAdapter = new RedisIoAdapter(app);
  const configService = app.get<ConfigService>(ConfigService);
  await redisIoAdapter.connectToRedis(configService.get<string>('REDIS_IP'), configService.get<string>('REDIS_PORT'));
  app.useWebSocketAdapter(redisIoAdapter);
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
}

bootstrap();
