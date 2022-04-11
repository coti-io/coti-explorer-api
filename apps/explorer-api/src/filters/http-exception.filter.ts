import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ExplorerError } from '../errors/explorer-error';
import { Status } from '@app/shared';

@Catch()
export class ExplorerExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: any, host: ArgumentsHost): void {
    const logger = new Logger('ExplorerErrorFilter');
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const httpStatus = exception instanceof ExplorerError ? exception.statusCode : exception.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const status = exception instanceof ExplorerError ? exception.status : exception.status || Status.STATUS_ERROR;
    const message = exception instanceof ExplorerError ? exception.message : exception?.response?.message?.toString() || 'Internal server error';
    const responseBody = {
      status,
      errorMessage: message,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };
    logger.error(responseBody);
    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
