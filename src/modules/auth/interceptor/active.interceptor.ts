import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';
import { Request, Response } from 'express';
import { TokenService } from '../../token/token.service';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { parseTimeToSeconds } from 'src/common/util/time.util';
import { UserRole } from 'src/common/enum/user-role.enum';
import {
  TokenMetadata,
  TokenPayload,
} from '../../token/types/token-payload.types';
import { v4 as uuidv4 } from 'uuid';
import { SessionService } from '../../session/session.service';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    token: string;
    role: string;
    tokenId?: string;
    sessionId?: string;
  };
}

interface ResponseWithCookie extends Response {
  cookie(name: string, value: string, options?: any): this;
}

interface RequestWithCookies extends Omit<Request, 'ip'> {
  cookies: {
    refreshToken?: string;
    [key: string]: string | undefined;
  };
  headers: {
    'user-agent'?: string;
    [key: string]: string | undefined;
  };
  ip: string;
}

@Injectable()
export class ActiveInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActiveInterceptor.name);
  private readonly ROLLING_PERIOD = '10m';

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly sessionService: SessionService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser & RequestWithCookies>();
    const response = context.switchToHttp().getResponse<ResponseWithCookie>();
    const user = request.user;

    if (!user?.sub) {
      this.logger.debug('[Token Validation] No user found in request');
      return next.handle();
    }

    const userAgentStr = request.headers['user-agent'] || 'unknown';
    const sessionId = user.sessionId || uuidv4();

    const metadata: TokenMetadata = {
      ip: request.ip || request.socket.remoteAddress || 'unknown',
      userAgent: userAgentStr,
      sessionId,
    };

    try {
      // 세션 검증 (userId만 사용)
      const isValidSession = await this.sessionService.validateSession(
        user.sub,
        metadata,
      );

      if (!isValidSession) {
        this.logger.warn(
          `[Session Validation] Invalid session for user ${user.sub}`,
        );

        // 세션 재생성
        const tokenId = uuidv4();
        await this.sessionService.createSession(user.sub, tokenId, metadata);
        await this.sessionService.updateActiveSession(user.sub);
        this.logger.log(`[Session] New session created for user ${user.sub}`);

        // 토큰 재발급
        const tokenPayload: TokenPayload = {
          sub: user.sub,
          role: user.role as UserRole,
          type: 'access',
          tokenId,
          sessionId,
        };

        const tokens = await this.tokenService.generateAndSetTokens(
          user.sub,
          tokenPayload,
          request.headers.origin,
        );

        // 쿠키 설정
        response.cookie(
          'accessToken',
          tokens.accessToken,
          tokens.accessOptions,
        );
        if (tokens.refreshToken && tokens.refreshOptions) {
          response.cookie(
            'refreshToken',
            tokens.refreshToken,
            tokens.refreshOptions,
          );
        }
      } else {
        // 기존 세션 업데이트
        await this.sessionService.updateSessionActivity(user.sub);
        await this.sessionService.updateActiveSession(user.sub);
        this.logger.debug(`[Session] Session updated for user ${user.sub}`);
      }

      // 슬라이딩 윈도우: accessToken 만료까지 5분 이하 남았을 때 accessToken만 갱신
      try {
        const decoded: unknown = this.jwtService.decode(user.token);
        if (
          decoded &&
          typeof decoded === 'object' &&
          'exp' in decoded &&
          typeof (decoded as { exp: number }).exp === 'number'
        ) {
          const exp = (decoded as { exp: number }).exp;
          const now = Math.floor(Date.now() / 1000);
          const remaining = exp - now;
          const slidingWindow = 5 * 60; // 5분(초)

          if (remaining > 0 && remaining <= slidingWindow) {
            this.logger.debug('[슬라이딩] accessToken만 갱신합니다.');

            if (!user.sessionId) {
              throw new UnauthorizedException(
                '세션이 만료되었습니다. 다시 로그인해주세요.',
              );
            }

            const tokenPayload: TokenPayload = {
              sub: user.sub,
              role: user.role as UserRole,
              type: 'access',
              tokenId: uuidv4(),
              sessionId: user.sessionId,
            };

            const { accessToken } = await this.tokenService.generateTokens(
              user.sub,
              tokenPayload,
            );

            // 세션 업데이트
            await this.sessionService.updateSessionActivity(user.sub);

            const accessTokenTtl =
              this.configService.get('jwt.accessTokenTtl', { infer: true }) ||
              this.ROLLING_PERIOD;
            const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;

            response.cookie('accessToken', accessToken, {
              httpOnly: true,
              secure: true,
              sameSite: 'none',
              domain: '.fit-date.co.kr',
              path: '/',
              maxAge: accessTokenMaxAge,
            });

            this.logger.debug(
              '[슬라이딩] 새로운 accessToken을 쿠키에 설정했습니다.',
            );
          }
        }
      } catch (err) {
        this.logger.error('[슬라이딩] accessToken 만료 시간 파싱 실패:', err);
      }

      return next.handle();
    } catch (error) {
      this.logger.error('[Session] Error during session handling:', error);
      throw new UnauthorizedException(
        '세션 처리 중 오류가 발생했습니다. 다시 로그인해주세요.',
      );
    }
  }
}
