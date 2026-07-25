import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Role } from '@prisma/client';

export type AuthTokenPayload = {
  sub: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
  type: 'access' | 'refresh';
  jti?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
};

@Injectable()
export class TokenService {
  signAccess(payload: Pick<AuthTokenPayload, 'sub' | 'email' | 'phone' | 'role'>) {
    return this.sign(payload, 'access', Number(process.env.AUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS ?? 86400));
  }

  signRefresh(payload: Pick<AuthTokenPayload, 'sub' | 'email' | 'phone' | 'role'>) {
    return this.sign(
      payload,
      'refresh',
      this.refreshExpiresInSeconds(),
      randomUUID(),
    );
  }

  verify(token: string, expectedType: AuthTokenPayload['type'] = 'access') {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = this.signPayload(`${encodedHeader}.${encodedPayload}`);

    if (!this.signatureMatches(signature, expectedSignature)) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as AuthTokenPayload;

      if (payload.type !== expectedType || payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private sign(
    payload: Pick<AuthTokenPayload, 'sub' | 'email' | 'phone' | 'role'>,
    type: AuthTokenPayload['type'],
    expiresInSeconds: number,
    jti?: string,
  ) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const fullPayload: AuthTokenPayload = {
      ...payload,
      type,
      jti,
      iat: issuedAt,
      exp: issuedAt + expiresInSeconds,
      iss: 'skillbridge-api',
      aud: process.env.JWT_AUDIENCE ?? 'skillbridge-api',
    };
    const encodedHeader = this.base64Url(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    );
    const encodedPayload = this.base64Url(JSON.stringify(fullPayload));
    const signature = this.signPayload(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private signPayload(payload: string) {
    const secret = process.env.AUTH_TOKEN_SECRET;

    if (!secret) {
      throw new Error('AUTH_TOKEN_SECRET is required to sign SkillBridge auth tokens.');
    }

    return createHmac('sha256', secret).update(payload).digest('base64url');
  }

  private base64Url(value: string) {
    return Buffer.from(value).toString('base64url');
  }

  private signatureMatches(actual: string, expected: string) {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  refreshExpiresInSeconds() {
    return Number(process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS ?? 604_800);
  }
}
