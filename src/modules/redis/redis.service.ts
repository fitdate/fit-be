import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { AllConfig } from 'src/common/config/config.types';

@Injectable()
export class RedisService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService<AllConfig>) {}

  // 애플리케이션 부팅 시 Redis 클라이언트 시작작
  onApplicationBootstrap() {
    this.redisClient = new Redis({
      host: this.configService.getOrThrow('redis.host', {
        infer: true,
      }),
      port: this.configService.getOrThrow('redis.port', {
        infer: true,
      }),
      retryStrategy: (times) => {
        if (times > 10) {
          return null;
        }

        return Math.min(times * 1000, 10000);
      },
    });
  }

  // 애플리케이션 종료 시 Redis 클라이언트 종료
  onApplicationShutdown() {
    return this.redisClient.quit();
  }

  // 사용자 토큰 저장
  async insert(userId: string, tokenId: string): Promise<void> {
    await this.redisClient.set(this.getKey(userId), tokenId);
  }

  // 사용자 토큰 검증
  async validate(userId: string, tokenId: string): Promise<boolean> {
    const storedId = await this.redisClient.get(this.getKey(userId));
    if (storedId !== tokenId) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
    return storedId === tokenId;
  }

  // 사용자 토큰 무효화
  async invalidate(userId: string): Promise<void> {
    await this.redisClient.del(this.getKey(userId));
  }

  // 키 생성
  private getKey(userId: string): string {
    return `user-${userId}`;
  }

  // 키 저장
  async set(key: string, value: string, ttl: number): Promise<void> {
    await this.redisClient.set(key, value, 'EX', ttl);
  }

  // 키 조회
  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  // 키 삭제
  async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }
}
