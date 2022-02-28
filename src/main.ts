import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { appModuleConfig } from './configurations';
import { SocketIoAdapter } from './socket-io-adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, appModuleConfig);
  const config = new DocumentBuilder().setTitle('Explorer API').setDescription('The explorer API description').setVersion('1.0').build();
  app.enableCors();
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.useWebSocketAdapter(new SocketIoAdapter(app));
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(3000);
}

bootstrap();
