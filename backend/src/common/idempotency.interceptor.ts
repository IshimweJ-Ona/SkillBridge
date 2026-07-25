import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

type CacheEntry = {
  status: 'PENDING' | 'COMPLETED';
  response?: unknown;
  timestamp: number;
};

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

    if (!idempotencyKey || !['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return next.handle();
    }

    const now = Date.now();
    this.cleanExpired(now);

    const existing = this.cache.get(idempotencyKey);
    if (existing) {
      if (existing.status === 'PENDING') {
        throw new ConflictException(
          'A request with this Idempotency-Key is currently processing. Please wait.',
        );
      }
      if (existing.status === 'COMPLETED' && existing.response) {
        return of(existing.response);
      }
    }

    this.cache.set(idempotencyKey, { status: 'PENDING', timestamp: now });

    return next.handle().pipe(
      tap({
        next: (res) => {
          this.cache.set(idempotencyKey, {
            status: 'COMPLETED',
            response: res,
            timestamp: Date.now(),
          });
        },
        error: () => {
          this.cache.delete(idempotencyKey);
        },
      }),
    );
  }

  private cleanExpired(now: number) {
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL_MS) {
        this.cache.delete(key);
      }
    }
  }
}
