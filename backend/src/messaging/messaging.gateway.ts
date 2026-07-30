import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/token.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'messaging',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // socketId -> userUuid

  constructor(private readonly tokenService: TokenService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Unauthorized WebSocket connection attempt (${client.id}): No token provided`);
        client.disconnect(true);
        return;
      }

      const payload = this.tokenService.verify(token, 'access');
      if (!payload) {
        this.logger.warn(`Unauthorized WebSocket connection attempt (${client.id}): Invalid/Expired token`);
        client.disconnect(true);
        return;
      }

      const userRoom = `user:${payload.sub}`;
      await client.join(userRoom);
      this.connectedUsers.set(client.id, payload.sub);

      this.logger.log(`WebSocket client connected: ${client.id} (User UUID: ${payload.sub}) joined room ${userRoom}`);
      client.emit('connected', {
        status: 'authenticated',
        userSub: payload.sub,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(`WebSocket connection error for ${client.id}:`, err);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userSub = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);
    this.logger.log(`WebSocket client disconnected: ${client.id} (User: ${userSub ?? 'unknown'})`);
  }

  /** Push a real-time messaging event to a specific user's connected socket clients */
  emitToUser(userUuid: string, event: string, payload: unknown) {
    const userRoom = `user:${userUuid}`;
    this.server.to(userRoom).emit(event, {
      event,
      data: payload,
      timestamp: new Date().toISOString(),
    });
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    const tokenFromAuth = client.handshake.auth?.token;
    if (typeof tokenFromAuth === 'string') {
      return tokenFromAuth.replace(/^Bearer\s+/i, '').trim();
    }
    const tokenFromQuery = client.handshake.query?.token;
    if (typeof tokenFromQuery === 'string') {
      return tokenFromQuery.trim();
    }
    return null;
  }
}
