import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { IncomingHttpHeaders } from 'http2';
import { AuthService } from '../services';
import * as requestIp from 'request-ip';

@Injectable()
export class AdminApiKeyAuthGuard implements CanActivate {
  logger = new Logger('AdminApiKeyAuthGuard');

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const ip = requestIp.getClientIp(request);
      this.logger.log(`[canActivate][requestIp][${ip}]`);
      const headers: IncomingHttpHeaders = request.headers;
      const authorization: string = headers.authorization;
      const bearerToken: string[] = authorization.split(' ');
      const token: string = bearerToken[1];
      const isAdmin = await this.authService.validateAdminApiKey(token);
      const isIpValid = await this.authService.validateIp(ip);

      return isAdmin && isIpValid;
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}
