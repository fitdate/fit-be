import { Injectable } from '@nestjs/common';
import { Session } from './types/session.types';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SessionService {
  private sessions: Map<string, Session> = new Map();

  constructor(private readonly redisService: RedisService) {}

  async upsertSession(session: Session) {
    const sessionKey = `session:${session.userId}:${session.deviceId}:${session.tokenId}`;
    const storedMetadata = await this.redisService.get(sessionKey);
    if (!storedMetadata) {
      return false;
    }
    const parsedMetadata = JSON.parse(storedMetadata) as Session;
  }
}
