import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { SessionService } from './session.service';
import { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SocketMetadata, JwtPayload } from './types/session.types';
@WebSocketGateway()
export class SessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SessionGateway.name);
  constructor(
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const metadata = this.extractMetadata(client);
      await this.sessionService.updateActiveSession(
        metadata.userId,
        metadata.deviceId,
      );
      await client.join(`${metadata.userId}:${metadata.deviceId}`);
      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
      this.logger.error(
        `Connection error: ${error instanceof Error ? error.message : error}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const metadata = this.extractMetadata(client);
      await this.sessionService.deleteActiveSession(
        metadata.userId,
        metadata.deviceId,
      );
      await client.leave(`${metadata.userId}:${metadata.deviceId}`);
      this.logger.log(`Client disconnected: ${client.id}`);
    } catch (error) {
      this.logger.error(
        `Disconnect error: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private extractMetadata(client: Socket): SocketMetadata {
    const token = client.handshake.auth.token as string;
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = this.jwtService.verify<JwtPayload>(token);
    if (!decoded.sub || !decoded.deviceId) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: decoded.sub,
      deviceId: decoded.deviceId,
    };
  }
}
