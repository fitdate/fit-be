import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { SessionService } from './session.service';
import { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { TokenService } from '../token/token.service';

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
    private readonly configService: ConfigService<AllConfig>,
    private readonly tokenService: TokenService,
  ) {}

  // 클라이언트 연결 처리
  async handleConnection(client: Socket) {
    this.logger.log(
      `client.handshake: ${JSON.stringify(client.handshake)}, client.id: ${client.id}`,
    );
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

  // 유저 상태 조회 요청 처리
  @SubscribeMessage('get:user:status')
  async handleGetUserStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userIds: string[] },
  ) {
    const metadata = this.extractMetadata(client);
    this.logger.log(
      `유저 상태 조회 요청: userIds=${data.userIds.join(',')}, 요청자 userId=${metadata.userId}`,
    );
    const statuses = await Promise.all(
      data.userIds.map(async (userId) => {
        const isActive = await this.sessionService.isActiveSession(userId);
        return { userId, isActive };
      }),
    );
    client.emit('userStatus', statuses);
    this.logger.log(`유저 상태 응답: ${JSON.stringify(statuses)}`);
    return statuses;
  }

  // 클라이언트 연결 해제 처리
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

  // 쿠키에서 토큰 추출 및 검증
  private extractMetadata(client: Socket): { userId: string } {
    this.logger.debug(`Headers: ${JSON.stringify(client.handshake.headers)}`);
    this.logger.debug(`Cookies: ${client.handshake.headers.cookie}`);

    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) {
      this.logger.error('쿠키가 제공되지 않았습니다.');
      throw new Error('No cookies provided');
    }

    try {
      const cookiePairs = cookieHeader.split(';');
      this.logger.debug(`Cookie pairs: ${JSON.stringify(cookiePairs)}`);

      for (const pair of cookiePairs) {
        const [key, value] = pair.trim().split('=');
        this.logger.debug(`Checking cookie: ${key}=${value}`);

        if (key === 'accessToken') {
          this.logger.debug(`Found access token in headers: ${value}`);
          return this.tokenService.validateAccessTokenFromCookie(value);
        }
      }

      this.logger.error('accessToken이 쿠키에 없습니다.');
      throw new Error('No access token in cookies');
    } catch (error) {
      this.logger.error(
        `토큰 검증 실패: ${error instanceof Error ? error.message : error}`,
      );
      throw new Error('Invalid token');
    }
  }
}
