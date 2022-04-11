import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response> {
    return next.handle().pipe(
      map(data => {
        return data;
      }),
    );
  }
}
