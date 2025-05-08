import { Injectable } from '@nestjs/common';
import { Session } from './types/session.types';
import { RedisService } from '../redis/redis.service';
import { TokenMetadata } from '../token/types/token-payload.types';
import { parseTimeToSeconds } from 'src/common/util/time.util';
@Injectable()
export class SessionService {
  private sessions: Map<string, Session> = new Map();

  constructor(private readonly redisService: RedisService) {}

  async upsertSession(session: Session, metadata: TokenMetadata) {
    const sessionKey = `session:${session.userId}:${session.deviceId}:${session.tokenId}`;
    const storedMetadata = await this.redisService.get(sessionKey);
    if (!storedMetadata) {
      return false;
    }
    const parsedMetadata = JSON.parse(storedMetadata) as TokenMetadata;
    if (
      parsedMetadata.ip !== metadata.ip ||
      parsedMetadata.userAgent !== metadata.userAgent
    ) {
      return false;
    }
    return true;
  }

  async deactivateSession(session: Session) {
    const sessionKey = `session:${session.userId}:${session.deviceId}:${session.tokenId}`;
    const sessionData = this.sessions.get(sessionKey);
    if (sessionData) {
      sessionData.isActive = false;
      sessionData.lastActive = new Date();
      await this.redisService.set(
        sessionKey,
        JSON.stringify(sessionData),
        parseTimeToSeconds('1h'),
      );
    }
  }

  async getSession(session: Session) {
    const sessionKey = `session:${session.userId}:${session.deviceId}:${session.tokenId}`;
    const sessionData = await this.redisService.get(sessionKey);
    return JSON.parse(sessionData) as Session;
  }

  async getAllSessions(userId: string) {
    const sessionKey = `session:${userId}:*`;
    const sessionData = await this.redisService.get(sessionKey);
    return JSON.parse(sessionData) as Session[];
  }

  async deleteSession(session: Session) {
    const sessionKey = `session:${session.userId}:${session.deviceId}:${session.tokenId}`;
    await this.redisService.del(sessionKey);
  }
}
