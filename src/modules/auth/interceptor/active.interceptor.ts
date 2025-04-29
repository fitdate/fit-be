import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';
import { Request, Response } from 'express';
import { TokenService } from '../services/token.service';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { parseTimeToSeconds } from 'src/common/util/time.util';
import { TokenMetadata } from '../types/token-payload.types';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    token: string;
    role: string;
    tokenId?: string;
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

    // 쿠키 디버깅
    this.logger.debug('Request cookies:', request.cookies);
    this.logger.debug('Request headers:', request.headers);
    this.logger.debug('User:', user);

    if (!user?.sub || !user?.token) {
      return next.handle(); // 인증 정보 없음
    }

    const isValid = await this.redisService.isAccessTokenValid(user.token);
    if (!isValid) {
      // refresh token으로 새로운 토큰 쌍 발급
      const refreshToken = request.cookies?.refreshToken;
      if (!refreshToken || !user.tokenId) {
        throw new UnauthorizedException(
          '세션이 만료되었습니다. 다시 로그인해주세요.',
        );
      }

      const metadata: TokenMetadata = {
        ip: request.ip || request.socket.remoteAddress || 'unknown',
        userAgent: request.headers['user-agent'] || 'unknown',
      };

      try {
        const newTokens = await this.tokenService.rotateTokens(
          user.sub,
          user.tokenId,
          user.role as any,
          metadata,
        );

        // 새로운 토큰을 쿠키에 설정
        const accessTokenTtl =
          this.configService.get('jwt.accessTokenTtl', { infer: true }) ||
          this.ROLLING_PERIOD;
        const refreshTokenTtl =
          this.configService.get('jwt.refreshTokenTtl', { infer: true }) ||
          '7d';

        const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;
        const refreshTokenMaxAge = parseTimeToSeconds(refreshTokenTtl) * 1000;

        if (response?.cookie) {
          // IP와 User-Agent 정보를 포함한 쿠키 옵션
          const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            domain: '.fit-date.co.kr',
            path: '/',
          };

          response.cookie('accessToken', newTokens.accessToken, {
            ...cookieOptions,
            maxAge: accessTokenMaxAge,
          });
          response.cookie('refreshToken', newTokens.refreshToken, {
            ...cookieOptions,
            maxAge: refreshTokenMaxAge,
          });

          this.logger.debug(
            `New tokens issued for user ${user.sub} from IP: ${metadata.ip}, User-Agent: ${metadata.userAgent}`,
          );
        }
      } catch (error) {
        this.logger.error('Token rotation failed:', error);
        throw new UnauthorizedException(
          '세션이 만료되었습니다. 다시 로그인해주세요.',
        );
      }
    }

    return next.handle();
  }
}
