import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'typeorm';
import { isWhitelisted } from '@app/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(private configService: ConfigService, private connection: Connection) {}

  async validateAdminApiKey(apiKey: string): Promise<boolean> {
    const adminApiKey = this.configService.get<string>('ADMIN_API_KEY');

    return apiKey === adminApiKey;
  }

  async validateIp(ip: string) {
    const queryRunner = this.connection.createQueryRunner();
    let whitelist = false;

    try {
      whitelist = await isWhitelisted(queryRunner, ip);
    } catch (error) {
      this.logger.error(`[validateIp][${error}]`);
    } finally {
      if (!queryRunner.isReleased) await queryRunner.release();
    }

    return whitelist;
  }
}
