import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { appModuleConfig } from './configurations';
import { SocketIoAdapter } from './socket-io-adapter';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, appModuleConfig);
  const config = new DocumentBuilder().setTitle('Explorer API').setDescription('The explorer API description').setVersion('1.0').build();
  app.enableCors();
  app.use(helmet());
  app.useStaticAssets(join(__dirname, '..', 'static'));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.useWebSocketAdapter(new SocketIoAdapter());
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(3000);
}
bootstrap();
