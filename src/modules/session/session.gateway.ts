import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { SessionService } from './session.service';
import { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SubscribeMessage } from '@nestjs/websockets';
@WebSocketGateway({
  cors: {
    origin: 'https://www.fit-date.co.kr',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  path: '/socket.io/status',
  transports: ['websocket'],
})
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
      this.logger.log(
        `클라이언트 연결: userId=${metadata.userId}, clientId=${client.id}`,
      );
      await this.sessionService.updateActiveSession(metadata.userId);
      await client.join(`${metadata.userId}`);
      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
      this.logger.error(
        `연결 오류: ${error instanceof Error ? error.message : error}`,
      );
      client.disconnect();
    }
  }

  @SubscribeMessage('get:user:status')
  async handleGetUserStatus(client: Socket, payload: { userIds: string[] }) {
    // const metadata = this.extractMetadata(client);
    // this.logger.log(
    //   `유저 상태 조회 요청: userIds=${payload.userIds.join(',')}, 요청자 userId=${metadata.userId}`,
    // );
    const statuses = await Promise.all(
      payload.userIds.map(async (userId) => {
        const isActive = await this.sessionService.isActiveSession(userId);
        return { userId, isActive };
      }),
    );
    client.emit('userStatus', statuses);
    this.logger.log(`유저 상태 응답: ${JSON.stringify(statuses)}`);
    return statuses;
  }

  async handleDisconnect(client: Socket) {
    try {
      const metadata = this.extractMetadata(client);
      this.logger.log(
        `클라이언트 연결 해제: userId=${metadata.userId}, clientId=${client.id}`,
      );
      await this.sessionService.deleteActiveSession(metadata.userId);
      await client.leave(`${metadata.userId}`);
      this.logger.log(`Client disconnected: ${client.id}`);
    } catch (error) {
      this.logger.error(
        `연결 해제 오류: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private extractMetadata(client: Socket): { userId: string } {
    const token = client.handshake.auth.token as string;
    if (!token) {
      this.logger.error('토큰이 제공되지 않았습니다.');
      throw new Error('No token provided');
    }

    const decoded = this.jwtService.verify<{ sub: string }>(token);
    if (!decoded.sub) {
      this.logger.error('토큰 payload가 올바르지 않습니다.');
      throw new Error('Invalid token payload');
    }

    this.logger.log(`메타데이터 추출: userId=${decoded.sub}`);
    return {
      userId: decoded.sub,
    };
  }
}
