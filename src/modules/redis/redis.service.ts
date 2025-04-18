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

  onApplicationBootstrap() {
    try {
      this.redisClient = new Redis({
        host: this.configService.getOrThrow('redis.host', {
          infer: true,
        }),
        port: this.configService.getOrThrow('redis.port', {
          infer: true,
        }),
        // password: this.configService.get('REDIS_PASSWORD'),
        retryStrategy: (times) => {
          if (times > 10) {
            console.error(
              'Redis connection failed after 10 retries. Giving up.',
            );
            return null; // Stop retrying after 10 attempts
          }
          const delay = Math.min(times * 1000, 10000); // 1s, 2s, ..., max 10s delay
          console.log(
            `Redis connection failed (Attempt ${times}). Retrying in ${delay}ms...`,
          );
          return delay;
        },
        // maxRetriesPerRequest: 3, // This option is for command retries, not initial connection
      });

      this.redisClient.on('error', (error: any) => {
        // Log only if it's not a connection retry error, as retryStrategy already logs
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (error.code !== 'ENOTFOUND' && error.syscall !== 'getaddrinfo') {
          console.error('Redis client error:', error);
        }
      });

      this.redisClient.on('connect', () => {
        console.log('Successfully connected to Redis');
      });
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw new Error('Failed to connect to Redis', { cause: error });
    }
  }

  onApplicationShutdown() {
    return this.redisClient.quit();
  }

  async insert(userId: string, tokenId: string): Promise<void> {
    try {
      await this.redisClient.set(this.getKey(userId), tokenId);
    } catch (error) {
      console.error('Redis insert error:', error);
      throw error;
    }
  }

  async validate(userId: string, tokenId: string): Promise<boolean> {
    try {
      const storedId = await this.redisClient.get(this.getKey(userId));
      if (storedId !== tokenId) {
        throw new UnauthorizedException('Invalid token');
      }
      return storedId === tokenId;
    } catch (error) {
      console.error('Redis validate error:', error);
      throw error;
    }
  }

  async invalidate(userId: string): Promise<void> {
    try {
      await this.redisClient.del(this.getKey(userId));
    } catch (error) {
      console.error('Redis invalidate error:', error);
      throw error;
    }
  }

  private getKey(userId: string): string {
    return `user-${userId}`;
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    await this.redisClient.set(key, value, 'EX', ttl);
  }

  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }
}
