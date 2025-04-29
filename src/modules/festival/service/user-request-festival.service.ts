import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { FestivalDto } from '../dto/festival.dto';

@Injectable()
export class UserRequestFestivalService {
  private readonly logger = new Logger(UserRequestFestivalService.name);

  constructor(private readonly redisService: RedisService) {}
  async getFestivalsByAreaName(region: string): Promise<FestivalDto[]> {
    try {
      const redisKey = `festivals:${region}`; // Redis 키 생성
      this.logger.debug(
        `[getFestivalsByAreaName] Redis에서 데이터 조회: ${redisKey}`,
      );

      const cachedData = await this.redisService.get(redisKey);

      if (!cachedData) {
        this.logger.warn(
          `[getFestivalsByAreaName] Redis에 데이터가 없습니다: ${redisKey}`,
        );
        throw new NotFoundException(
          `해당 지역(${region})에 대한 축제 정보가 없습니다.`,
        );
      }

      // Redis에서 가져온 데이터를 JSON 파싱
      const festivals = JSON.parse(cachedData) as FestivalDto[];
      this.logger.debug(
        `[getFestivalsByAreaName] Redis에서 데이터 조회 성공: ${redisKey}`,
      );
      return festivals;
    } catch (error) {
      this.logger.error(
        `[getFestivalsByAreaName] 데이터 조회 중 오류 발생: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw new NotFoundException('축제 정보를 가져오는 데 실패했습니다.');
    }
  }
}
