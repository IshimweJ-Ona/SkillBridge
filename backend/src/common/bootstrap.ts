import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { TokenService } from '../auth/token.service';
import { ApiResponseInterceptor } from './api-response.interceptor';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { ApiExceptionFilter } from './api-exception.filter';
import { JwtAuthGuard } from './jwt-auth.guard';

export async function bootstrapApp(
  module: Parameters<typeof NestFactory.create>[0],
  serviceName: string,
  defaultPort: number,
) {
  registerProcessFaultHandlers(serviceName);

  const app = await NestFactory.create(module);
  validateEnvironment();
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...allowedOrigins],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(json({ limit: process.env.REQUEST_BODY_LIMIT ?? '1mb' }));
  app.use(urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT ?? '1mb' }));

  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by SkillBridge CORS policy.'));
    },
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor(), new IdempotencyInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector), app.get(TokenService)));

  const port = Number(process.env.PORT ?? defaultPort);
  await app.listen(port);
  console.log(`${serviceName} listening on port ${port}`);
}

// Every HTTP request is already isolated by ApiExceptionFilter (registered
// below via useGlobalFilters): a thrown/rejected error inside a controller
// or service turns into a 500 response for that one request and never
// reaches here. These handlers are a safety net for errors that occur
// outside the request lifecycle (e.g. an unawaited promise in a background
// job) so that one such error can't silently take down this whole service
// process - and, since each of the 5 SkillBridge services runs as its own
// PM2 process, this failure never touches the other 4 services either way.
function registerProcessFaultHandlers(serviceName: string) {
  process.on('unhandledRejection', (reason) => {
    console.error(`[${serviceName}] Unhandled promise rejection:`, reason);
  });

  process.on('uncaughtException', (error) => {
    console.error(`[${serviceName}] Uncaught exception:`, error);
    // Unlike an unhandled rejection, a synchronous uncaught exception can
    // leave process state in an unknown condition - exit and let PM2's
    // autorestart bring this one process back rather than limping on.
    process.exit(1);
  });
}

function validateEnvironment() {
  const required = ['DATABASE_URL', 'AUTH_TOKEN_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }

  if (
    process.env.NODE_ENV === 'production' &&
    process.env.AUTH_TOKEN_SECRET === 'change-this-before-production'
  ) {
    throw new Error('AUTH_TOKEN_SECRET must be changed before production startup.');
  }
}
