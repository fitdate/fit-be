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
import { CookieOptions } from 'express';
import { JwtTokenResponse } from '../auth/types/auth.types';
import { TokenPayload } from './types/token-payload.types';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly redisService: RedisService,
  ) {}

  private createAccessTokenKey(
    userId: string,
    tokenId: string,
    sessionId: string,
  ): string {
    return `access_token:${userId}:${tokenId}:${sessionId}`;
  }

  private createRefreshTokenKey(
    userId: string,
    tokenId: string,
    sessionId: string,
  ): string {
    return `refresh_token:${userId}:${tokenId}:${sessionId}`;
  }

  // 토큰 생성
  async generateTokens(
    userId: string,
    deviceType: string,
    tokenPayload: TokenPayload,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenId: string;
  }> {
    try {
      this.logger.debug(`[Token Generation] Starting for user: ${userId}`);
      this.logger.debug(
        `[Token Generation] Generated tokenId: ${tokenPayload.tokenId}`,
      );

      // 1. 토큰 생성
      const accessToken = this.generateAccessToken(
        userId,
        tokenPayload.role,
        tokenPayload.tokenId,
      );

      const refreshToken = this.generateRefreshToken(
        userId,
        deviceType,
        tokenPayload.tokenId,
        tokenPayload.sessionId,
      );

      // 2. Redis에 토큰 저장
      await this.saveAccessToken(
        tokenPayload.tokenId,
        userId,
        tokenPayload.sessionId,
      );

      await this.saveRefreshToken(
        tokenPayload.tokenId,
        userId,
        tokenPayload.sessionId,
      );

      this.logger.debug(
        `[Token Generation] Successfully generated and stored tokens for user: ${userId}`,
      );

      return {
        accessToken,
        refreshToken,
        tokenId: tokenPayload.tokenId,
      };
    } catch (error) {
      this.logger.error(
        `Token generation failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException('토큰 생성에 실패했습니다.');
    }
  }

  // Access Token 생성
  private generateAccessToken(
    userId: string,
    userRole: UserRole,
    tokenId: string,
  ): string {
    try {
      this.logger.debug(`Generating access token for user: ${userId}`);
      const accessTokenSecret = this.configService.getOrThrow(
        'jwt.accessTokenSecret',
        { infer: true },
      );
      const accessTokenExpiresIn = this.configService.getOrThrow(
        'jwt.accessTokenTtl',
        { infer: true },
      );

      const accessToken = this.jwtService.sign(
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

      return accessToken;
    } catch (error) {
      this.logger.error(
        `Access token generation failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException(
        'Access 토큰 생성에 실패했습니다.',
      );
    }
  }

  // Refresh Token 생성 및 Redis 저장
  private generateRefreshToken(
    userId: string,
    deviceType: string,
    tokenId: string,
    sessionId: string,
  ): string {
    try {
      this.logger.debug(`Generating refresh token for user: ${userId}`);

      const refreshTokenSecret = this.configService.getOrThrow(
        'jwt.refreshTokenSecret',
        { infer: true },
      );
      const refreshTokenExpiresIn = this.configService.getOrThrow(
        'jwt.refreshTokenTtl',
        { infer: true },
      );

      const refreshToken = this.jwtService.sign(
        {
          sub: userId,
          type: 'refresh',
          jti: tokenId,
          sessionId,
          deviceType,
        },
        {
          secret: refreshTokenSecret,
          expiresIn: refreshTokenExpiresIn,
        },
      );
      return refreshToken;
    } catch (error) {
      this.logger.error(
        `Refresh token generation failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException(
        'Refresh 토큰 생성에 실패했습니다.',
      );
    }
  }

  // Refresh Token 유효성 검사
  async validateRefreshToken(tokenPayload: TokenPayload): Promise<boolean> {
    try {
      const redisKey = this.createRefreshTokenKey(
        tokenPayload.sub,
        tokenPayload.tokenId,
        tokenPayload.sessionId,
      );
      const storedTokenId = await this.redisService.get(redisKey);

      if (!storedTokenId) {
        this.logger.warn(
          `Refresh token not found for user ${tokenPayload.sub}`,
        );
        return false;
      }

      if (storedTokenId !== tokenPayload.tokenId) {
        this.logger.warn(`Token ID mismatch for user ${tokenPayload.sub}`);
        return false;
      }

      // 토큰 만료 시간 확인
      const tokenExpiry = await this.redisService.ttl(redisKey);
      if (tokenExpiry <= 0) {
        this.logger.warn(`Refresh token expired for user ${tokenPayload.sub}`);
        await this.deleteRefreshToken(
          tokenPayload.sub,
          tokenPayload.tokenId,
          tokenPayload.sessionId,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Refresh token validation failed: ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
  }

  // Refresh Token 삭제
  async deleteRefreshToken(
    userId: string,
    tokenId: string,
    sessionId: string,
  ): Promise<void> {
    try {
      const redisKey = this.createRefreshTokenKey(userId, tokenId, sessionId);
      await this.redisService.del(redisKey);
    } catch (error) {
      this.logger.error(
        `Refresh token deletion failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException(
        'Refresh 토큰 삭제에 실패했습니다.',
      );
    }
  }

  // 토큰 유효성 검사
  async isAccessTokenValid(
    tokenId: string,
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    try {
      const redisKey = this.createAccessTokenKey(userId, tokenId, sessionId);
      const value = await this.redisService.get(redisKey);
      return value === userId;
    } catch (error) {
      this.logger.error(
        `Access token validation failed: ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
  }

  // 액세스 토큰 저장
  async saveAccessToken(
    tokenId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    try {
      const accessTokenExpiresIn = this.configService.getOrThrow(
        'jwt.accessTokenTtl',
        { infer: true },
      );
      const ttlSeconds = parseTimeToSeconds(accessTokenExpiresIn);
      const redisKey = this.createAccessTokenKey(userId, tokenId, sessionId);
      await this.redisService.set(redisKey, userId, ttlSeconds);
    } catch (error) {
      this.logger.error(
        `Access token storage failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException(
        'Access 토큰 저장에 실패했습니다.',
      );
    }
  }

  // 리프레시 토큰 저장
  async saveRefreshToken(
    tokenId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    try {
      const refreshTokenExpiresIn = this.configService.getOrThrow(
        'jwt.refreshTokenTtl',
        { infer: true },
      );
      const ttlSeconds = parseTimeToSeconds(refreshTokenExpiresIn);
      const redisKey = this.createRefreshTokenKey(userId, tokenId, sessionId);
      await this.redisService.set(redisKey, tokenId, ttlSeconds);
    } catch (error) {
      this.logger.error(
        `Refresh token storage failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException(
        'Refresh 토큰 저장에 실패했습니다.',
      );
    }
  }

  // 액세스 토큰 삭제
  async deleteAccessToken(
    tokenId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    try {
      const redisKey = this.createAccessTokenKey(userId, tokenId, sessionId);
      await this.redisService.del(redisKey);
    } catch (error) {
      this.logger.error(
        `Access token deletion failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException(
        'Access 토큰 삭제에 실패했습니다.',
      );
    }
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
    deviceType: string,
    tokenPayload: TokenPayload,
    origin?: string,
  ): Promise<JwtTokenResponse> {
    this.logger.debug('Generating tokens for user:', {
      userId,
      deviceType,
      tokenPayload,
    });

    const { accessToken, refreshToken } = await this.generateTokens(
      userId,
      deviceType,
      tokenPayload,
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
