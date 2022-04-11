import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { LiveAppModule } from './live-app.module';
import { appModuleConfig } from './configurations';
import { RedisIoAdapter } from './redis-io-adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(LiveAppModule, appModuleConfig);
  const config = new DocumentBuilder().setTitle('Explorer API').setDescription('The explorer API description').setVersion('1.0').build();
  app.enableCors();
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(process.env.REDIS_IP, process.env.REDIS_PORT);
  app.useWebSocketAdapter(redisIoAdapter);
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT || 3001);
}

bootstrap();
