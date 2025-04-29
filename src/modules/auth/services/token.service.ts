import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { UserRole } from 'src/common/enum/user-role.enum';
import { RedisService } from '../../redis/redis.service';
import { parseTimeToSeconds } from 'src/common/util/time.util';
import { v4 as uuidv4 } from 'uuid';
import { CookieOptions } from 'express';
import { JwtTokenResponse } from '../types/auth.types';

interface TokenMetadata {
  ip: string;
  userAgent: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly redisService: RedisService,
  ) {}

  // 모든 세션 무효화
  async invalidateAllSessions(userId: string): Promise<void> {
    await this.redisService.delMultiple(
      `refresh:${userId}`,
      `session:${userId}`,
    );
  }

  // 토큰 생성
  async generateTokens(
    userId: string,
    userRole: UserRole,
    metadata: TokenMetadata,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenId: string;
  }> {
    // 1️⃣ 먼저 기존 세션 제거!
    await this.invalidateAllSessions(userId);

    // 2️⃣ 새 tokenId 만들고 저장
    const tokenId = uuidv4();
    this.logger.debug(`Generated tokenId: ${tokenId}`);

    // 3️⃣ Access/Refresh Token 발급
    const accessToken = this.generateAccessToken(userId, userRole);
    this.logger.debug(`Generated access token for user: ${userId}`);

    const refreshToken = await this.generateAndStoreRefreshToken(
      userId,
      tokenId,
    );
    this.logger.debug(`Generated and stored refresh token for user: ${userId}`);

    // 4️⃣ Session 메타데이터 저장
    await this.redisService.set(
      `session:${userId}`,
      JSON.stringify(metadata),
      parseTimeToSeconds(
        this.configService.get('jwt.refreshTokenTtl', { infer: true }) || '7d',
      ),
    );

    // 5️⃣ Access Token Redis에 저장
    const accessTokenTtl =
      this.configService.getOrThrow('jwt.accessTokenTtl', {
        infer: true,
      }) || '30m';
    await this.redisService.set(
      `access_token:${accessToken}`,
      userId,
      parseTimeToSeconds(accessTokenTtl),
    );

    this.logger.debug(`Stored access token in Redis for user: ${userId}`);

    return {
      accessToken,
      refreshToken,
      tokenId,
    };
  }

  // Access Token 생성
  private generateAccessToken(userId: string, userRole: UserRole): string {
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
    const redisKey = `refresh:${userId}`;
    this.logger.debug(`Storing refresh token in Redis:`, {
      key: redisKey,
      ttlSeconds,
    });

    await this.redisService.set(redisKey, tokenId, ttlSeconds);
    this.logger.debug(`Successfully stored refresh token in Redis`);

    return refreshToken;
  }

  // Refresh Token 유효성 검사
  async validateRefreshToken(
    userId: string,
    tokenId: string,
    metadata: TokenMetadata,
  ): Promise<boolean> {
    const redisKey = `refresh:${userId}`;
    const storedTokenId = await this.redisService.get(redisKey);
    if (storedTokenId !== tokenId) {
      return false;
    }

    // 세션 메타데이터 검증
    const sessionKey = `session:${userId}`;
    const storedMetadata = await this.redisService.get(sessionKey);
    if (!storedMetadata) {
      return false;
    }

    const parsedMetadata = JSON.parse(storedMetadata) as TokenMetadata;
    if (
      parsedMetadata.ip !== metadata.ip ||
      parsedMetadata.userAgent !== metadata.userAgent
    ) {
      this.logger.warn(
        `Session metadata mismatch for user ${userId}. Expected: ${JSON.stringify(metadata)}, Got: ${JSON.stringify(parsedMetadata)}`,
      );
      return false;
    }

    return true;
  }

  // Refresh Token 삭제
  async deleteRefreshToken(userId: string): Promise<void> {
    await this.redisService.delMultiple(
      `refresh:${userId}`,
      `session:${userId}`,
    );
  }

  // Refresh Token으로 새로운 토큰 쌍 발급
  async rotateTokens(
    userId: string,
    oldTokenId: string,
    userRole: UserRole,
    metadata: TokenMetadata,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenId: string;
  }> {
    // 기존 refresh token 검증
    const isValid = await this.validateRefreshToken(
      userId,
      oldTokenId,
      metadata,
    );
    if (!isValid) {
      throw new UnauthorizedException('유효하지 않은 refresh token입니다');
    }

    // 기존 refresh token 삭제
    await this.deleteRefreshToken(userId);

    // 새로운 토큰 쌍 발급
    return this.generateTokens(userId, userRole, metadata);
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
    metadata: TokenMetadata,
    origin?: string,
  ): Promise<JwtTokenResponse> {
    this.logger.debug('Generating tokens for user:', {
      userId,
      userRole,
      metadata,
    });

    const { accessToken, refreshToken } = await this.generateTokens(
      userId,
      userRole,
      metadata,
    );

    this.logger.debug('Generated tokens:', { accessToken, refreshToken });

    const accessTokenTtl =
      this.configService.get('jwt.accessTokenTtl', { infer: true }) || '30m';
    const refreshTokenTtl =
      this.configService.get('jwt.refreshTokenTtl', { infer: true }) || '7d';

    const accessTokenMaxAge = parseTimeToSeconds(accessTokenTtl) * 1000;
    const refreshTokenMaxAge = parseTimeToSeconds(refreshTokenTtl) * 1000;

    this.logger.debug('Cookie options:', {
      accessTokenMaxAge,
      refreshTokenMaxAge,
      origin,
    });

    return {
      accessToken,
      refreshToken,
      accessOptions: this.createCookieOptions(accessTokenMaxAge, origin),
      refreshOptions: this.createCookieOptions(refreshTokenMaxAge, origin),
    };
  }
}
