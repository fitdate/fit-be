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

    if (!user?.sub) {
      this.logger.debug('[Token Validation] No user found in request');
      return next.handle();
    }

    this.logger.debug('[Token Validation] Checking token validity for user:', {
      userId: user.sub,
      token: user.token,
      tokenId: user.tokenId,
      role: user.role,
    });

    if (!user.tokenId) {
      this.logger.warn(
        `[Token Validation] tokenId가 없습니다: user ${user.sub}`,
      );
      throw new UnauthorizedException(
        '세션이 만료되었습니다. 다시 로그인해주세요.',
      );
    }

    // Redis에서 토큰 유효성 검증 (tokenId 기반)
    const isValid = await this.tokenService.isAccessTokenValid(
      user.tokenId,
      user.sub,
    );
    this.logger.debug('[Token Validation] Redis validation result:', {
      isValid,
      userId: user.sub,
      tokenId: user.tokenId,
      redisKey: `access_token:${user.tokenId}`,
    });

    if (!isValid) {
      this.logger.debug(
        `[Token Validation] Token invalid for user ${user.sub}, attempting refresh`,
      );

      const refreshToken = request.cookies?.refreshToken;
      if (!refreshToken || !user.tokenId) {
        this.logger.warn(
          `[Token Validation] No refresh token or tokenId found for user ${user.sub}`,
        );
        throw new UnauthorizedException(
          '세션이 만료되었습니다. 다시 로그인해주세요.',
        );
      }

      try {
        const metadata: TokenMetadata = {
          ip: request.ip || request.socket.remoteAddress || 'unknown',
          userAgent: request.headers['user-agent'] || 'unknown',
        };

        this.logger.debug('[Token Validation] Attempting token rotation:', {
          userId: user.sub,
          tokenId: user.tokenId,
        });

        const newTokens = await this.tokenService.rotateTokens(
          user.sub,
          user.tokenId,
          user.role as any,
          metadata,
        );

        this.logger.debug('[Token Validation] Token rotation successful:', {
          userId: user.sub,
          newAccessToken: newTokens.accessToken,
        });

        // 새로운 토큰을 쿠키에 설정
        const accessTokenTtl =
          this.configService.get('jwt.accessTokenTtl', { infer: true }) ||
          this.ROLLING_PERIOD;
        const refreshTokenTtl =
          this.configService.get('jwt.refreshTokenTtl', { infer: true }) ||
          '7d';

        const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;
        const refreshTokenMaxAge = parseTimeToSeconds(refreshTokenTtl) * 1000;

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
          `[Token Validation] New tokens set in cookies for user ${user.sub}`,
        );
      } catch (error) {
        this.logger.error('[Token Validation] Token rotation failed:', error);
        throw new UnauthorizedException(
          '세션이 만료되었습니다. 다시 로그인해주세요.',
        );
      }
    }

    return next.handle();
  }
}
