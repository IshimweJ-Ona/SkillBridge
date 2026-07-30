import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

// TLS terminates at HAProxy, then nginx proxies to these services on
// localhost - req.ip/req.socket.remoteAddress would just be nginx's own
// address, not the real visitor. nginx's proxy_pass blocks already set both
// headers below (see /etc/nginx/sites-available/jonaintra.tech), so read
// the real client IP from there directly instead of relying on Express's
// trust-proxy machinery.
export const ClientIp = createParamDecorator((_data: unknown, context: ExecutionContext): string | undefined => {
  const request = context.switchToHttp().getRequest<Request>();

  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp;
  }

  return request.socket?.remoteAddress ?? request.ip;
});
