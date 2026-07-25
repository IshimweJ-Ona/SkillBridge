import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable, map } from 'rxjs';

type ApiResponse<T> = {
  success: boolean;
  apiVersion: 'v1';
  requestId: string;
  message: string;
  data: T;
};

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const requestId =
      (req?.headers?.['x-request-id'] as string) || randomUUID();

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('x-request-id', requestId);
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        apiVersion: 'v1' as const,
        requestId,
        message: 'Request completed successfully.',
        data,
      })),
    );
  }
}
