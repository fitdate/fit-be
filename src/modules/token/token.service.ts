import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { UserRole } from 'src/common/enum/user-role.enum';
import { RedisService } from '../redis/redis.service';
import { parseTimeToSeconds } from 'src/common/util/time.util';
import { v4 as uuidv4 } from 'uuid';
import { CookieOptions } from 'express';
import { JwtTokenResponse } from '../auth/types/auth.types';
import { TokenMetadata } from './types/token-payload.types';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly redisService: RedisService,
  ) {}

  // 모든 세션 무효화 (userId의 모든 tokenId 세션 삭제)
  async invalidateAllSessions(userId: string): Promise<void> {
    try {
      const refreshKeys = await this.redisService.keys(`refresh:${userId}:*`);
      const sessionKeys = await this.redisService.keys(`session:${userId}:*`);
      const accessTokenKeys = await this.redisService.keys(`access_token:*`);
      for (const key of [...refreshKeys, ...sessionKeys]) {
        await this.redisService.del(key);
      }
      for (const key of accessTokenKeys) {
        const value = await this.redisService.get(key);
        if (value === userId) {
          await this.redisService.del(key);
        }
      }
    } catch (error) {
      this.logger.error(
        `Redis 연결 실패: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException('Redis 연결에 실패했습니다.');
    }
  }

  // 토큰 생성
  async generateTokens(
    userId: string,
    userRole: UserRole,
    metadata: TokenMetadata & { deviceId: string },
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenId: string;
  }> {
    this.logger.debug(`[Token Generation] Starting for user: ${userId}`);
    await this.invalidateDeviceSession(userId, metadata.deviceId);
    const tokenId = uuidv4();
    this.logger.debug(`[Token Generation] Generated tokenId: ${tokenId}`);
    const accessToken = this.generateAccessToken(userId, userRole, tokenId);
    const accessTokenTtl =
      this.configService.getOrThrow('jwt.accessTokenTtl', { infer: true }) ||
      '30m';
    await this.redisService.set(
      `access_token:${tokenId}`,
      userId,
      parseTimeToSeconds(accessTokenTtl),
    );
    this.logger.debug(
      `[Token Generation] Stored access token in Redis: ${accessToken}`,
    );
    const refreshToken = await this.generateAndStoreRefreshToken(
      userId,
      metadata.deviceId,
      tokenId,
    );
    this.logger.debug(
      `[Token Generation] Generated and stored refresh token: ${refreshToken}`,
    );
    const refreshTokenTtl =
      this.configService.getOrThrow('jwt.refreshTokenTtl', { infer: true }) ||
      '7d';
    await this.redisService.set(
      `session:${userId}:${metadata.deviceId}:${tokenId}`,
      JSON.stringify(metadata),
      parseTimeToSeconds(refreshTokenTtl),
    );
    this.logger.debug(
      `[Token Generation] Stored session metadata for user: ${userId}`,
    );
    return {
      accessToken,
      refreshToken,
      tokenId,
    };
  }

  // Access Token 생성 (jti 포함)
  private generateAccessToken(
    userId: string,
    userRole: UserRole,
    tokenId: string,
  ): string {
    this.logger.debug(`Generating access token for user: ${userId}`);
    const accessTokenSecret = this.configService.getOrThrow(
      'jwt.accessTokenSecret',
      { infer: true },
    );
    const accessTokenExpiresIn = this.configService.getOrThrow(
      'jwt.accessTokenTtl',
      { infer: true },
    );
    const token = this.jwtService.sign(
      {
        sub: userId,
        role: userRole,
        type: 'access',
        jti: tokenId,
      },
      {
        secret: accessTokenSecret,
        expiresIn: accessTokenExpiresIn,
      },
    );
    return token;
  }

  // Refresh Token 생성 및 Redis 저장 (tokenId 기반)
  private async generateAndStoreRefreshToken(
    userId: string,
    deviceId: string,
    tokenId: string,
  ): Promise<string> {
    this.logger.debug(
      `Generating refresh token for user: ${userId}, deviceId: ${deviceId}, tokenId: ${tokenId}`,
    );
    const refreshTokenSecret = this.configService.getOrThrow(
      'jwt.refreshTokenSecret',
      { infer: true },
    );
    const refreshTokenExpiresIn = this.configService.getOrThrow(
      'jwt.refreshTokenTtl',
      { infer: true },
    );
    this.logger.debug(`Refresh token configuration:`, {
      expiresIn: refreshTokenExpiresIn,
      hasSecret: !!refreshTokenSecret,
    });
    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        type: 'refresh',
        deviceId,
        jti: tokenId,
      },
      {
        secret: refreshTokenSecret,
        expiresIn: refreshTokenExpiresIn,
      },
    );
    const ttlSeconds = parseTimeToSeconds(refreshTokenExpiresIn);
    const redisKey = `refresh:${userId}:${deviceId}:${tokenId}`;
    this.logger.debug(`Storing refresh token in Redis:`, {
      key: redisKey,
      ttlSeconds,
    });
    await this.redisService.set(redisKey, tokenId, ttlSeconds);
    this.logger.debug(`Successfully stored refresh token in Redis`);
    return refreshToken;
  }

  // Refresh Token 유효성 검사 (tokenId 기반)
  async validateRefreshToken(
    userId: string,
    deviceId: string,
    tokenId: string,
    metadata: TokenMetadata,
  ): Promise<boolean> {
    const redisKey = `refresh:${userId}:${deviceId}:${tokenId}`;
    const storedTokenId = await this.redisService.get(redisKey);
    if (storedTokenId !== tokenId) {
      return false;
    }
    // 세션 메타데이터 검증
    const sessionKey = `session:${userId}:${deviceId}:${tokenId}`;
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

  // Refresh Token 삭제 (tokenId 기반)
  async deleteRefreshToken(
    userId: string,
    deviceId: string,
    tokenId: string,
  ): Promise<void> {
    await this.redisService.del(`refresh:${userId}:${deviceId}:${tokenId}`);
    await this.redisService.del(`session:${userId}:${deviceId}:${tokenId}`);
  }

  // Refresh Token으로 새로운 토큰 쌍 발급 (tokenId 기반)
  async rotateTokens(
    userId: string,
    deviceId: string,
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
      deviceId,
      oldTokenId,
      metadata,
    );
    if (!isValid) {
      throw new UnauthorizedException('유효하지 않은 refresh token입니다');
    }
    // 기존 refresh token 삭제
    await this.deleteRefreshToken(userId, deviceId, oldTokenId);
    // 새로운 토큰 쌍 발급
    const metaWithDeviceId = { ...metadata, deviceId };
    return this.generateTokens(userId, userRole, metaWithDeviceId);
  }

  // 토큰 유효성 검사 (tokenId 기반)
  async isAccessTokenValid(tokenId: string, userId: string): Promise<boolean> {
    const value = await this.redisService.get(`access_token:${tokenId}`);
    return value === userId;
  }

  // 토큰 저장 (tokenId 기반)
  async saveAccessToken(tokenId: string, userId: string): Promise<void> {
    const accessTokenExpiresIn = this.configService.getOrThrow(
      'jwt.accessTokenTtl',
      { infer: true },
    );
    const ttlSeconds = parseTimeToSeconds(accessTokenExpiresIn);
    await this.redisService.set(`access_token:${tokenId}`, userId, ttlSeconds);
  }

  // 토큰 삭제 (tokenId 기반)
  async deleteAccessToken(tokenId: string): Promise<void> {
    await this.redisService.del(`access_token:${tokenId}`);
  }

  // 최상위 도메인 추출
  private getRootDomain(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return `.${parts.slice(-2).join('.')}`;
    }
    return `.${hostname}`;
  }

  // 쿠키 옵션 생성
  createCookieOptions(maxAge: number, origin?: string): CookieOptions {
    this.logger.debug(`쿠키 옵션 생성: maxAge=${maxAge}, origin=${origin}`);
    let domain: string | undefined;

    const allowedDomains = [
      'localhost',
      'api.fit-date.co.kr',
      'www.fit-date.co.kr',
      this.configService.get('app.host', { infer: true }) || undefined,
    ].filter(Boolean);

    if (origin) {
      try {
        const hostname = new URL(origin).hostname;
        const isAllowed = allowedDomains.some((d) => hostname === d);
        if (!isAllowed) {
          this.logger.warn(`허용되지 않은 origin: ${origin}`);
          throw new UnauthorizedException('허용되지 않은 origin입니다.');
        }
        domain = hostname;
        this.logger.debug(`origin 기반 도메인 사용: ${domain}`);
      } catch {
        domain = undefined;
        this.logger.warn('origin 파싱 실패, 도메인 미설정');
        throw new UnauthorizedException('유효하지 않은 origin입니다.');
      }
    } else {
      domain = this.configService.get('app.host', { infer: true }) || undefined;
      this.logger.debug(`app.host 기반 도메인 사용: ${domain}`);
    }

    const options: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge,
      domain: '.fit-date.co.kr',
      path: '/',
    };

    this.logger.debug(`최종 쿠키 옵션:`, options);
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
    metadata: TokenMetadata & { deviceId: string },
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

  async invalidateDeviceSession(
    userId: string,
    deviceId: string,
  ): Promise<void> {
    try {
      const refreshKeys = await this.redisService.keys(
        `refresh:${userId}:${deviceId}:*`,
      );
      const sessionKeys = await this.redisService.keys(
        `session:${userId}:${deviceId}:*`,
      );
      for (const key of [...refreshKeys, ...sessionKeys]) {
        await this.redisService.del(key);
      }
    } catch (error) {
      this.logger.error(
        `Redis 연결 실패: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException('Redis 연결에 실패했습니다.');
    }
  }
}
