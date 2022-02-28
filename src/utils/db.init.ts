import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

export function dbsyncInit() {
  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    name: 'db_sync',
    useFactory: (configService: ConfigService) => ({
      name: 'db_sync',
      type: 'mysql',
      host: configService.get<string>('DB_SYNC_HOST'),
      port: configService.get<number>('DB_SYNC_PORT'),
      username: configService.get<string>('DB_SYNC_USER'),
      password: configService.get<string>('DB_SYNC_PASSWORD'),
      database: configService.get<string>('DB_SYNC_NAME'),
      entities: ['dist/entities/*.entity{.ts,.js}'],
      timezone: 'Z',
      connectTimeout: 60 * 60 * 1000,
      timeout: 60 * 60 * 1000,
    }),
  });
}
