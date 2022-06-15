import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DbAppEntities, ExplorerEntities } from '@app/shared';

export function explorerDbInit() {
  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
      type: 'mysql',
      host: configService.get<string>('DB_HOST'),
      port: configService.get<number>('DB_PORT'),
      username: configService.get<string>('DB_USER'),
      password: configService.get<string>('DB_PASSWORD'),
      database: configService.get<string>('DB_NAME'),
      entities: ExplorerEntities,
      logging: false,
      connectTimeout: 60 * 60 * 1000,
      acquireTimeout: 60 * 60 * 1000,
      timeout: 60 * 60 * 1000,
      timezone: 'Z',
      extra: {
        connectionLimit: 10,
      },
    }),
  });
}

export function dbAppInit() {
  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    name: 'db_app',
    useFactory: (configService: ConfigService) => ({
      name: 'db_app',
      type: 'mysql',
      host: configService.get<string>('DB_APP_HOST'),
      port: configService.get<number>('DB_APP_PORT'),
      username: configService.get<string>('DB_APP_USER'),
      password: configService.get<string>('DB_APP_PASSWORD'),
      database: configService.get<string>('DB_APP_NAME'),
      entities: DbAppEntities,
      logging: true,
      timezone: 'Z',
      connectTimeout: 60 * 60 * 1000,
      timeout: 60 * 60 * 1000,
    }),
  });
}
