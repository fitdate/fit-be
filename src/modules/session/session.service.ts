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
      sessionId: metadata.sessionId,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      isActive: true,
      lastActive: new Date(),
      createdAt: new Date(),
    };

    const sessionKey = `session:${userId}`;
    await this.redisService.set(
      sessionKey,
      JSON.stringify(session),
      parseTimeToSeconds('7d'),
    );

    this.logger.log(
      `세션 생성: userId=${userId}, sessionId=${metadata.sessionId}`,
    );
    return session;
  }

  async validateSession(
    userId: string,
    metadata: TokenMetadata,
  ): Promise<boolean> {
    const sessionKey = `session:${userId}`;
    const storedSession = await this.redisService.get(sessionKey);

    if (!storedSession) {
      this.logger.warn(`세션 없음: userId=${userId}`);
      return false;
    }

    try {
      const session = JSON.parse(storedSession) as Session;

      // 세션이 비활성화되었는지 확인
      if (!session.isActive) {
        this.logger.warn(`비활성 세션: userId=${userId}`);
        return false;
      }

      // 세션 만료 시간 확인 (7일)
      const sessionAge = Date.now() - new Date(session.createdAt).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
      if (sessionAge > maxAge) {
        this.logger.warn(`세션 만료: userId=${userId}`);
        await this.deactivateSession(userId);
        return false;
      }

      // 메타데이터 검증
      const isValid =
        session.ip === metadata.ip && session.userAgent === metadata.userAgent;

      if (!isValid) {
        this.logger.warn(`세션 메타데이터 불일치: userId=${userId}`);
        return false;
      }

      this.logger.log(`세션 유효: userId=${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`세션 검증 오류: userId=${userId}`, error);
      return false;
    }
  }

  async updateSessionActivity(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;
    const storedSession = await this.redisService.get(sessionKey);

    if (storedSession) {
      const session = JSON.parse(storedSession) as Session;
      session.lastActive = new Date();
      await this.redisService.set(
        sessionKey,
        JSON.stringify(session),
        parseTimeToSeconds('7d'),
      );
      this.logger.log(`세션 활동 갱신: userId=${userId}`);
    }
  }

  async deactivateSession(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;
    const storedSession = await this.redisService.get(sessionKey);

    if (storedSession) {
      const session = JSON.parse(storedSession) as Session;
      session.isActive = false;
      await this.redisService.set(
        sessionKey,
        JSON.stringify(session),
        parseTimeToSeconds('1h'),
      );
      this.logger.log(`세션 비활성화: userId=${userId}`);
    }
  }

  async updateActiveSession(userId: string): Promise<void> {
    const sessionKey = `active_session:${userId}`;
    await this.redisService.set(
      sessionKey,
      JSON.stringify({ isActive: true }),
      parseTimeToSeconds('15m'),
    );
    this.logger.log(`활성 세션 갱신: userId=${userId}`);
  }

  async isActiveSession(userId: string): Promise<boolean> {
    const sessionKey = `active_session:${userId}`;
    const exists = (await this.redisService.exists(sessionKey)) === 1;
    this.logger.log(`활성 세션 조회: userId=${userId}, isActive=${exists}`);
    return exists;
  }

  async deleteActiveSession(userId: string): Promise<void> {
    await this.redisService.del(`active_session:${userId}`);
    this.logger.log(`활성 세션 삭제: userId=${userId}`);
  }

  async getSession(userId: string): Promise<Session | null> {
    const sessionKey = `session:${userId}`;
    const sessionData = await this.redisService.get(sessionKey);
    if (!sessionData) {
      this.logger.warn(`세션 데이터 없음: userId=${userId}`);
      return null;
    }
    this.logger.log(`세션 데이터 조회: userId=${userId}`);
    return JSON.parse(sessionData) as Session;
  }

  async getAllSessions(userId: string): Promise<Session[]> {
    const keys = await this.redisService.keys(`session:${userId}`);
    const sessions: Session[] = [];
    for (const key of keys) {
      const data = await this.redisService.get(key);
      if (data) {
        sessions.push(JSON.parse(data) as Session);
      }
    }
    this.logger.log(
      `모든 세션 조회: userId=${userId}, 세션 수=${sessions.length}`,
    );
    return sessions;
  }

  async deleteSession(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;
    await this.redisService.del(sessionKey);
    this.logger.log(`세션 삭제: userId=${userId}`);
  }
}
