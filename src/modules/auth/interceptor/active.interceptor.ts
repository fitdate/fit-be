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
import { UserRole } from 'src/common/enum/user-role.enum';
import { TokenMetadata } from '../types/token-payload.types';
import * as UAParser from 'ua-parser-js';

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

    // deviceId 안전 추출
    let deviceId: string = 'unknown-device';
    if (typeof request.headers['x-device-id'] === 'string') {
      deviceId = request.headers['x-device-id'] as string;
    } else if (
      request.cookies &&
      typeof request.cookies.deviceId === 'string'
    ) {
      deviceId = request.cookies.deviceId;
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
        this.logger.debug(
          '[슬라이딩 체크] accessToken 만료까지 남은 시간:',
          `${remaining}초`,
        );
        if (remaining > 0 && remaining <= slidingWindow) {
          // accessToken만 새로 발급, refreshToken은 그대로
          this.logger.debug('[슬라이딩] accessToken만 갱신합니다.');
          const userAgentStr = request.headers['user-agent'] || 'unknown';
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/ban-ts-comment
          const parser = new (UAParser as any).default(userAgentStr);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const device = parser.getDevice();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const deviceType: string =
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            device && device.type ? device.type : 'desktop';
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const browserInfo = parser.getBrowser();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const browser: string =
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            browserInfo && browserInfo.name ? browserInfo.name : 'unknown';
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const osInfo = parser.getOS();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const os: string = osInfo && osInfo.name ? osInfo.name : 'unknown';
          const metadata: TokenMetadata = {
            ip: request.ip || request.socket.remoteAddress || 'unknown',
            userAgent: userAgentStr,
            deviceId,
            deviceType,
            browser,
            os,
          };
          const { accessToken } = await this.tokenService.generateTokens(
            user.sub,
            user.role as UserRole,
            metadata,
          );
          const accessTokenTtl =
            this.configService.get('jwt.accessTokenTtl', { infer: true }) ||
            this.ROLLING_PERIOD;
          const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;
          const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'none' as const,
            domain: '.fit-date.co.kr',
            path: '/',
          };
          response.cookie('accessToken', accessToken, {
            ...cookieOptions,
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
        const userAgentStr = request.headers['user-agent'] || 'unknown';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/ban-ts-comment
        const parser = new (UAParser as any).default(userAgentStr);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const device = parser.getDevice();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const deviceType: string =
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          device && device.type ? device.type : 'desktop';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const browserInfo = parser.getBrowser();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const browser: string =
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          browserInfo && browserInfo.name ? browserInfo.name : 'unknown';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const osInfo = parser.getOS();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const os: string = osInfo && osInfo.name ? osInfo.name : 'unknown';
        const metadata: TokenMetadata = {
          ip: request.ip || request.socket.remoteAddress || 'unknown',
          userAgent: userAgentStr,
          deviceId,
          deviceType,
          browser,
          os,
        };

        this.logger.debug('[Token Validation] Attempting token rotation:', {
          userId: user.sub,
          tokenId: user.tokenId,
        });

        const newTokens = await this.tokenService.rotateTokens(
          user.sub,
          deviceId,
          user.tokenId,
          user.role as UserRole,
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
          secure: true,
          sameSite: 'none' as const,
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
        response.clearCookie('accessToken', {
          path: '/',
          domain: '.fit-date.co.kr',
        });
        response.clearCookie('refreshToken', {
          path: '/',
          domain: '.fit-date.co.kr',
        });
        throw new UnauthorizedException(
          '다른 기기에서 로그인되어 자동 로그아웃되었습니다. 다시 로그인해주세요.',
        );
      }
    }

    return next.handle();
  }
}
