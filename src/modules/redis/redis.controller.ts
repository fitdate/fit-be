import { Controller, Get, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('redis')
export class RedisController {
  private readonly logger = new Logger(RedisController.name);
  constructor(private readonly redisService: RedisService) {}

  // 모든 active session 조회
  @Get('active-sessions')
  async getActiveSessions() {
    this.logger.log('모든 active session을 조회합니다.');
    const keys = await this.redisService.keys('active_session:*');
    const results: { key: string; value: any }[] = [];
    for (const key of keys) {
      const value = await this.redisService.get(key);
      results.push({
        key,
        value: value ? (JSON.parse(value) as Record<string, unknown>) : null,
      });
    }
    this.logger.log(`조회 결과: ${JSON.stringify(results)}`);
    return results;
  }
}
