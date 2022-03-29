import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Status } from 'src/utils/http-constants';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response> {
    return next.handle().pipe(
      map(data => {
        data.status = Status.STATUS_SUCCESS;
        return data;
      }),
    );
  }
}
