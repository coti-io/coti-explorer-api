import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
export interface ExtendedMulterFile extends Express.Multer.File {
  uuid: string;
  hash: string;
}

@Injectable()
export class FileExtender implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    req.file['hash'] = req.body.hash;
    return next.handle();
  }
}
