import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { AllConfig } from 'src/common/config/config.types';

/**
 * Redis 서비스
 * Redis 데이터베이스와의 상호작용을 담당하는 서비스
 * 토큰 관리, 캐싱, 임시 데이터 저장 등의 기능 제공
 */
@Injectable()
export class RedisService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService<AllConfig>) {}

  /**
   * 애플리케이션 시작 시 Redis 클라이언트 초기화
   * 환경 설정에서 호스트와 포트 정보를 가져와 연결
   */
  onApplicationBootstrap() {
    this.redisClient = new Redis({
      host: this.configService.getOrThrow('redis.host', {
        infer: true,
      }),
      port: this.configService.getOrThrow('redis.port', {
        infer: true,
      }),
      // 연결 실패 시 재시도 전략
      retryStrategy: (times) => {
        // 10번 이상 재시도 실패 시 중단
        if (times > 10) {
          return null;
        }
        // 지수 백오프 방식으로 재시도 간격 설정 (1초, 2초, ..., 최대 10초)
        return Math.min(times * 1000, 10000);
      },
    });
  }

  /**
   * 애플리케이션 종료 시 Redis 연결 종료
   */
  onApplicationShutdown() {
    return this.redisClient.quit();
  }

  /**
   * 사용자 ID와 토큰 ID를 Redis에 저장
   * @param userId 사용자 ID
   * @param tokenId 토큰 ID
   */
  async insert(userId: string, tokenId: string): Promise<void> {
    await this.redisClient.set(this.getKey(userId), tokenId);
  }

  /**
   * 저장된 토큰 ID와 입력된 토큰 ID를 비교하여 유효성 검증
   * @param userId 사용자 ID
   * @param tokenId 검증할 토큰 ID
   * @returns 토큰이 유효한지 여부
   * @throws UnauthorizedException 토큰이 유효하지 않은 경우
   */
  async validate(userId: string, tokenId: string): Promise<boolean> {
    const storedId = await this.redisClient.get(this.getKey(userId));
    if (storedId !== tokenId) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
    return storedId === tokenId;
  }

  /**
   * 사용자의 토큰을 Redis에서 삭제
   * @param userId 사용자 ID
   */
  async invalidate(userId: string): Promise<void> {
    await this.redisClient.del(this.getKey(userId));
  }

  /**
   * Redis 키 생성
   * @param userId 사용자 ID
   * @returns Redis 키
   */
  private getKey(userId: string): string {
    return `user-${userId}`;
  }

  /**
   * Redis에 키-값 쌍을 저장하고 TTL 설정
   * @param key Redis 키
   * @param value 저장할 값
   * @param ttl 만료 시간(초)
   */
  async set(key: string, value: string, ttl: number): Promise<void> {
    await this.redisClient.set(key, value, 'EX', ttl);
  }

  /**
   * Redis에서 키에 해당하는 값을 조회
   * @param key Redis 키
   * @returns 저장된 값 또는 null
   */
  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  /**
   * Redis에서 키-값 쌍 삭제
   * @param key Redis 키
   * @returns 삭제된 키의 수
   */
  async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }
}
