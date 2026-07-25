import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export type RequestUser = {
  sub: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    return request.user;
  },
);
