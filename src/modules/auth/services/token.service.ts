import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { UserRole } from 'src/common/enum/user-role.enum';
import { RedisService } from '../../redis/redis.service';
import { parseTimeToSeconds } from 'src/common/util/time.util';
import { v4 as uuidv4 } from 'uuid';
import { CookieOptions } from 'express';
import { JwtTokenResponse } from '../types/auth.types';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly redisService: RedisService,
  ) {}

  // 토큰 생성
  async generateTokens(
    userId: string,
    userRole: UserRole,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenId: string;
  }> {
    this.logger.debug(
      `Generating tokens for user: ${userId}, role: ${userRole}`,
    );
    const tokenId = uuidv4();
    this.logger.debug(`Generated tokenId: ${tokenId}`);

    const accessToken = await this.generateAccessToken(userId, userRole);
    this.logger.debug(`Generated access token for user: ${userId}`);

    const refreshToken = await this.generateAndStoreRefreshToken(
      userId,
      tokenId,
    );
    this.logger.debug(`Generated and stored refresh token for user: ${userId}`);

    return {
      accessToken,
      refreshToken,
      tokenId,
    };
  }

  // Access Token 생성
  private async generateAccessToken(
    userId: string,
    userRole: UserRole,
  ): Promise<string> {
    this.logger.debug(`Generating access token for user: ${userId}`);
    const accessTokenSecret = this.configService.getOrThrow(
      'jwt.accessTokenSecret',
      {
        infer: true,
      },
    );

    const accessTokenExpiresIn = this.configService.getOrThrow(
      'jwt.accessTokenTtl',
      {
        infer: true,
      },
    );

    this.logger.debug(`Access token configuration:`, {
      expiresIn: accessTokenExpiresIn,
      hasSecret: !!accessTokenSecret,
    });

    const token = this.jwtService.sign(
      {
        sub: userId,
        role: userRole,
        type: 'access',
      },
      {
        secret: accessTokenSecret,
        expiresIn: accessTokenExpiresIn,
      },
    );

    // Redis에 토큰 저장
    const ttlSeconds = parseTimeToSeconds(accessTokenExpiresIn);
    await this.redisService.set(`access_token:${token}`, userId, ttlSeconds);

    return token;
  }

  // Refresh Token 생성 및 Redis 저장
  private async generateAndStoreRefreshToken(
    userId: string,
    tokenId: string,
  ): Promise<string> {
    this.logger.debug(
      `Generating refresh token for user: ${userId}, tokenId: ${tokenId}`,
    );
    const refreshTokenSecret = this.configService.getOrThrow(
      'jwt.refreshTokenSecret',
      {
        infer: true,
      },
    );

    const refreshTokenExpiresIn = this.configService.getOrThrow(
      'jwt.refreshTokenTtl',
      {
        infer: true,
      },
    );

    this.logger.debug(`Refresh token configuration:`, {
      expiresIn: refreshTokenExpiresIn,
      hasSecret: !!refreshTokenSecret,
    });

    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        type: 'refresh',
        tokenId,
      },
      {
        secret: refreshTokenSecret,
        expiresIn: refreshTokenExpiresIn,
      },
    );

    const ttlSeconds = parseTimeToSeconds(refreshTokenExpiresIn);
    const redisKey = `refresh:${userId}:${tokenId}`;
    this.logger.debug(`Storing refresh token in Redis:`, {
      key: redisKey,
      ttlSeconds,
    });

    await this.redisService.set(redisKey, tokenId, ttlSeconds);
    this.logger.debug(`Successfully stored refresh token in Redis`);

    return refreshToken;
  }

  // 토큰 유효성 검사
  async isAccessTokenValid(token: string): Promise<boolean> {
    const value = await this.redisService.get(`access_token:${token}`);
    return value !== null;
  }

  // 토큰 저장
  async saveAccessToken(token: string, userId: string): Promise<void> {
    const accessTokenExpiresIn = this.configService.getOrThrow(
      'jwt.accessTokenTtl',
      {
        infer: true,
      },
    );
    const ttlSeconds = parseTimeToSeconds(accessTokenExpiresIn);
    await this.redisService.set(`access_token:${token}`, userId, ttlSeconds);
  }

  // 토큰 삭제
  async deleteAccessToken(token: string): Promise<void> {
    await this.redisService.del(`access_token:${token}`);
  }

  // 쿠키 옵션 생성
  createCookieOptions(maxAge: number, origin?: string): CookieOptions {
    this.logger.debug(
      `Creating cookie options with maxAge: ${maxAge}, origin: ${origin}`,
    );
    let domain: string | undefined;

    const configDomain = this.configService.get('app.host', {
      infer: true,
    });
    if (configDomain) {
      domain = configDomain;
      this.logger.debug(`Using config domain: ${domain}`);
    } else if (origin) {
      const hostname = new URL(origin).hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        domain = 'localhost';
      } else {
        domain = hostname;
      }
      this.logger.debug(`Using origin hostname as domain: ${domain}`);
    }

    const options: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      domain: '.fit-date.co.kr',
      path: '/',
    };

    this.logger.debug(`Created cookie options:`, options);
    return options;
  }

  // 로그아웃 쿠키 옵션 생성
  getLogoutCookieOptions(origin?: string): {
    accessOptions: CookieOptions;
    refreshOptions: CookieOptions;
  } {
    this.logger.debug(`Creating logout cookie options for origin: ${origin}`);
    const options = {
      accessOptions: this.createCookieOptions(0, origin),
      refreshOptions: this.createCookieOptions(0, origin),
    };
    this.logger.debug(`Created logout cookie options:`, options);
    return options;
  }

  // 토큰 생성 및 설정
  async generateAndSetTokens(
    userId: string,
    userRole: UserRole,
    origin?: string,
  ): Promise<JwtTokenResponse> {
    const { accessToken, refreshToken } = await this.generateTokens(
      userId,
      userRole,
    );

    const accessTokenTtl =
      this.configService.get('jwt.accessTokenTtl', { infer: true }) || '30m';
    const refreshTokenTtl =
      this.configService.get('jwt.refreshTokenTtl', { infer: true }) || '7d';

    const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;
    const refreshTokenMaxAge = parseTimeToSeconds(refreshTokenTtl) * 1000;

    return {
      accessToken,
      refreshToken,
      accessOptions: this.createCookieOptions(accessTokenMaxAge, origin),
      refreshOptions: this.createCookieOptions(refreshTokenMaxAge, origin),
    };
  }
}
