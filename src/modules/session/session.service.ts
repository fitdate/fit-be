import { Injectable, Logger } from '@nestjs/common';
import { Session } from './types/session.types';
import { RedisService } from '../redis/redis.service';
import { parseTimeToSeconds } from 'src/common/util/time.util';
import { TokenMetadata } from '../token/types/token-payload.types';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly redisService: RedisService) {}

  async createSession(
    userId: string,
    tokenId: string,
    metadata: TokenMetadata,
  ): Promise<Session> {
    const session: Session = {
      userId,
      tokenId,
      deviceId: metadata.deviceId,
      sessionId: metadata.sessionId,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      deviceType: metadata.deviceType,
      browser: metadata.browser,
      os: metadata.os,
      isActive: true,
      lastActive: new Date(),
      createdAt: new Date(),
    };

    const sessionKey = `session:${userId}:${metadata.deviceId}`;
    await this.redisService.set(
      sessionKey,
      JSON.stringify(session),
      parseTimeToSeconds('7d'),
    );

    return session;
  }

  async validateSession(
    userId: string,
    metadata: TokenMetadata,
  ): Promise<boolean> {
    const sessionKey = `session:${userId}:${metadata.deviceId}`;
    const storedSession = await this.redisService.get(sessionKey);

    if (!storedSession) {
      this.logger.warn(`Session not found for user ${userId}`);
      return false;
    }

    try {
      const session = JSON.parse(storedSession) as Session;

      // 세션이 비활성화되었는지 확인
      if (!session.isActive) {
        this.logger.warn(`Session is inactive for user ${userId}`);
        return false;
      }

      // 세션 만료 시간 확인 (7일)
      const sessionAge = Date.now() - new Date(session.createdAt).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
      if (sessionAge > maxAge) {
        this.logger.warn(`Session expired for user ${userId}`);
        await this.deactivateSession(userId, metadata.deviceId);
        return false;
      }

      // 메타데이터 검증
      const isValid =
        session.ip === metadata.ip &&
        session.userAgent === metadata.userAgent &&
        session.deviceType === metadata.deviceType;

      if (!isValid) {
        this.logger.warn(`Session metadata mismatch for user ${userId}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error validating session for user ${userId}:`, error);
      return false;
    }
  }

  async updateSessionActivity(userId: string, deviceId: string): Promise<void> {
    const sessionKey = `session:${userId}:${deviceId}`;
    const storedSession = await this.redisService.get(sessionKey);

    if (storedSession) {
      const session = JSON.parse(storedSession) as Session;
      session.lastActive = new Date();
      await this.redisService.set(
        sessionKey,
        JSON.stringify(session),
        parseTimeToSeconds('7d'),
      );
    }
  }

  async deactivateSession(userId: string, deviceId: string): Promise<void> {
    const sessionKey = `session:${userId}:${deviceId}`;
    const storedSession = await this.redisService.get(sessionKey);

    if (storedSession) {
      const session = JSON.parse(storedSession) as Session;
      session.isActive = false;
      await this.redisService.set(
        sessionKey,
        JSON.stringify(session),
        parseTimeToSeconds('1h'),
      );
    }
  }

  async getSession(userId: string, deviceId: string): Promise<Session | null> {
    const sessionKey = `session:${userId}:${deviceId}`;
    const sessionData = await this.redisService.get(sessionKey);
    if (!sessionData) {
      return null;
    }
    return JSON.parse(sessionData) as Session;
  }

  async getAllSessions(userId: string): Promise<Session[]> {
    const keys = await this.redisService.keys(`session:${userId}:*`);
    const sessions: Session[] = [];
    for (const key of keys) {
      const data = await this.redisService.get(key);
      if (data) {
        sessions.push(JSON.parse(data) as Session);
      }
    }
    return sessions;
  }

  async deleteSession(userId: string, deviceId: string): Promise<void> {
    const sessionKey = `session:${userId}:${deviceId}`;
    await this.redisService.del(sessionKey);
  }
}
