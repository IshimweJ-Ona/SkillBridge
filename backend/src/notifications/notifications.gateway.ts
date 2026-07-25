import {
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
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
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // socketId -> userSub

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

  /** Push real-time notification event to a specific user's connected socket clients */
  emitToUser(userSub: string, event: string, payload: unknown) {
    const userRoom = `user:${userSub}`;
    this.logger.log(`Emitting WS event '${event}' to room ${userRoom}`);
    this.server.to(userRoom).emit(event, {
      event,
      data: payload,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    return { event: 'pong', timestamp: new Date().toISOString(), echo: data };
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
