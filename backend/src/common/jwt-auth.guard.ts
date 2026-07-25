import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { TokenService } from '../auth/token.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';

type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: {
    sub: string;
    email?: string | null;
    phone?: string | null;
    role: Role;
  };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const payload = this.tokenService.verify(token, 'access');

    if (!payload) {
      throw new UnauthorizedException('Your session has expired. Please log in again.');
    }

    request.user = {
      sub: payload.sub,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
    };

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles?.length && !requiredRoles.includes(payload.role)) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    return true;
  }

  private extractToken(request: AuthenticatedRequest) {
    const authHeader = request.headers.authorization;
    const authorization = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }

    const cookieHeader = request.headers.cookie;
    const cookie = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader;

    return cookie
      ?.split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith('access_token='))
      ?.slice('access_token='.length);
  }
}
