import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { UserRole } from 'src/common/enum/user-role.enum';
import { RedisService } from '../redis/redis.service';
import { parseTimeToSeconds } from 'src/common/util/time.util';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly redisService: RedisService,
  ) {}

  async generateTokens(
    userId: string,
    userRole: UserRole,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenId: string;
  }> {
    // 토큰 ID 생성 (UUID)
    const tokenId = uuidv4();

    // Access Token 생성
    const accessToken = this.generateAccessToken(userId, userRole);

    // Refresh Token 생성 및 Redis 저장
    const refreshToken = await this.generateAndStoreRefreshToken(
      userId,
      tokenId,
    );

    return {
      accessToken,
      refreshToken,
      tokenId,
    };
  }

  private generateAccessToken(userId: string, userRole: UserRole): string {
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

    return this.jwtService.sign(
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
  }

  private async generateAndStoreRefreshToken(
    userId: string,
    tokenId: string,
  ): Promise<string> {
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

    // Refresh Token 생성
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

    // Redis에 토큰 ID 저장
    const ttlSeconds = parseTimeToSeconds(refreshTokenExpiresIn);
    await this.redisService.set(
      `refresh:${userId}:${tokenId}`,
      tokenId,
      ttlSeconds,
    );

    return refreshToken;
  }

  async validateRefreshToken(
    userId: string,
    tokenId: string,
  ): Promise<boolean> {
    const storedTokenId = await this.redisService.get(
      `refresh:${userId}:${tokenId}`,
    );
    return storedTokenId === tokenId;
  }

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    await this.redisService.del(`refresh:${userId}:${tokenId}`);
    this.logger.log(
      `Revoked refresh token for user: ${userId}, tokenId: ${tokenId}`,
    );
  }

  async rotateRefreshToken(
    userId: string,
    oldTokenId: string,
  ): Promise<{ accessToken: string; refreshToken: string; tokenId: string }> {
    // 이전 토큰 유효성 검사
    const isValid = await this.validateRefreshToken(userId, oldTokenId);
    if (!isValid) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    // 이전 토큰 삭제
    await this.revokeRefreshToken(userId, oldTokenId);

    // 새로운 토큰 발급
    return this.generateTokens(userId, UserRole.USER);
  }
}
