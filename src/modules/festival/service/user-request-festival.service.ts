import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { FestivalDto } from '../dto/festival.dto';
import { UserService } from '../../user/user.service';
import { RegionCode } from '../enum/festival-region.enum';
@Injectable()
export class UserRequestFestivalService {
  private readonly logger = new Logger(UserRequestFestivalService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) {}

  private sortFestivalsByStartDate(festivals: FestivalDto[]): FestivalDto[] {
    return [...festivals].sort((a, b) => {
      const dateA = new Date(
        a.startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      );
      const dateB = new Date(
        b.startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      );
      return dateB.getTime() - dateA.getTime();
    });
  }

  async getFestivalsByAreaName(region: string): Promise<FestivalDto[]> {
    try {
      const redisKey = `festivals:${region}`;
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

      const festivals = JSON.parse(cachedData) as FestivalDto[];
      const sortedFestivals = this.sortFestivalsByStartDate(festivals);

      this.logger.debug(
        `[getFestivalsByAreaName] Redis에서 데이터 조회 성공: ${redisKey}, 총 ${sortedFestivals.length}개의 축제`,
      );
      return sortedFestivals;
    } catch (error) {
      this.logger.error(
        `[getFestivalsByAreaName] 데이터 조회 중 오류 발생: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw new NotFoundException('축제 정보를 가져오는 데 실패했습니다.');
    }
  }

  async getFestivalByUserArea(userId: string): Promise<FestivalDto[]> {
    try {
      const user = await this.userService.findUserById(userId);
      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      const region =
        RegionCode[user.region as keyof typeof RegionCode] || user.region;

      const redisKey = `festivals:${region}`;
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

      const festivals = JSON.parse(cachedData) as FestivalDto[];
      const sortedFestivals = this.sortFestivalsByStartDate(festivals);

      this.logger.debug(
        `[getFestivalsByAreaName] Redis에서 데이터 조회 성공: ${redisKey}, 총 ${sortedFestivals.length}개의 축제`,
      );
      return sortedFestivals;
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
