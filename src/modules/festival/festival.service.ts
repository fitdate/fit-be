import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { FestivalDto } from './dto/festival.dto';
import { FestivalResponse } from './types/festival.types';
import { format } from 'date-fns';
import { NaverSearchService } from './service/naver-search.service';
import { AllConfig } from 'src/common/config/config.types';
import { FestivalItem } from './types/festival.types';
import { addMonths, isWithinInterval, parse } from 'date-fns';
import { RedisService } from '../redis/redis.service';
import { REGION_VALUES } from '../location/constants/region.constants';

@Injectable()
export class FestivalService {
  private readonly logger = new Logger(FestivalService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly naverSearchService: NaverSearchService,
    private readonly redisService: RedisService,
  ) {}

  // Cron 작업: 1시간마다 실행
  @Cron('0 9-17 * * 1-5') // 월~금, 9시~17시 매 정각 실행
  async handleCron() {
    this.logger.debug('[handleCron] 1시간마다 getFestivalByRegion 실행 시작');
    try {
      const regionCodes = REGION_VALUES; // 지역 코드 배열 가져오기
      this.logger.debug(
        `[handleCron] 지역 코드: ${JSON.stringify(regionCodes)}`,
      );
      await this.getFestivals();
      this.logger.debug(`[handleCron] 전체 축제 조회 처리 완료`);
    } catch (error) {
      this.logger.error(
        `[handleCron] Cron 작업 중 오류 발생: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  // 네이버 검색 URL 생성 로직
  private async getFestivalWithNaverSearchUrl(
    festival: FestivalItem,
  ): Promise<FestivalDto> {
    try {
      const searchQuery = `${festival.title}`;
      const naverSearchUrl =
        await this.naverSearchService.getTopFestivalLink(searchQuery);
      return {
        title: festival.title,
        startDate: festival.eventstartdate,
        endDate: festival.eventenddate,
        address: festival.addr1,
        areaCode: festival.areacode,
        thumbnail: festival.firstimage2,
        naverSearchUrl:
          naverSearchUrl ??
          `https://search.naver.com/search.naver?query=${encodeURIComponent(searchQuery)}`,
      };
    } catch (error) {
      this.logger.warn(
        `${error instanceof AxiosError ? error.message : `[getFestivalByRegion] 네이버 검색 실패 - ${festival.title}`}`,
      );
      return {
        title: festival.title,
        startDate: festival.eventstartdate,
        endDate: festival.eventenddate,
        address: festival.addr1,
        areaCode: festival.areacode,
        thumbnail: festival.firstimage2,
        naverSearchUrl: `https://search.naver.com/search.naver?query=${encodeURIComponent(festival.title)}`,
      };
    }
  }

  // endDate가 오늘부터 1달 이내인지 확인하는 로직
  private isWithinOneMonth(endDate: string): boolean {
    const parsedEndDate = parse(endDate, 'yyyyMMdd', new Date());
    const today = new Date();
    const oneMonthLater = addMonths(today, 1);
    return isWithinInterval(parsedEndDate, {
      start: today,
      end: oneMonthLater,
    });
  }

  async getFestivals(): Promise<Record<string, FestivalDto[]>> {
    try {
      this.logger.debug('[getFestivals] 전체 축제 조회 시작');
      const today = format(new Date(), 'yyyyMMdd');
      const numOfRows = 100;
      let pageNo = 1;
      let allFestivals: FestivalItem[] = [];
      const serviceKey: string = this.configService.getOrThrow(
        'publicApi.festivalDecodingApiKey',
        { infer: true },
      );

      while (true) {
        const params = {
          serviceKey,
          MobileOS: 'ETC',
          MobileApp: 'AppTest',
          numOfRows: `${numOfRows}`,
          pageNo: `${pageNo}`,
          _type: 'json',
          listYN: 'Y',
          arrange: 'A',
          eventStartDate: `${today}`,
        };

        this.logger.debug(
          `[getFestivals] 요청 파라미터: ${JSON.stringify(params)}`,
        );

        const response: AxiosResponse<FestivalResponse> = await firstValueFrom(
          this.httpService.get(
            'https://apis.data.go.kr/B551011/KorService1/searchFestival1',
            { params },
          ),
        );

        const requestedFestivals =
          response.data.response?.body?.items?.item || [];

        if (requestedFestivals.length === 0) {
          this.logger.debug(`[getFestivals] 더 이상의 축제 정보가 없습니다.`);
          break;
        }

        allFestivals = allFestivals.concat(requestedFestivals);
        pageNo++;
      }

      try {
        // 데이터 가져오기 및 처리
        const settledResults = await Promise.allSettled(
          allFestivals.map((festival) =>
            this.getFestivalWithNaverSearchUrl(festival),
          ),
        );

        const filteredResults = settledResults
          .filter(
            (result): result is PromiseFulfilledResult<FestivalDto> =>
              result.status === 'fulfilled',
          )
          .map((result) => result.value)
          .filter((festival) => this.isWithinOneMonth(festival.endDate));

        // 지역별로 매핑
        const groupedResults = filteredResults.reduce<
          Record<string, FestivalDto[]>
        >((acc, festival) => {
          const areaCode = festival.areaCode;
          if (!acc[areaCode]) {
            acc[areaCode] = [];
          }
          acc[areaCode].push(festival);
          return acc;
        }, {});

        // Redis에 저장 (30일 TTL)
        for (const [areaCode, festivals] of Object.entries(groupedResults)) {
          const redisKey = `festivals:${areaCode}`; // Redis 키 생성
          await this.redisService.set(
            redisKey,
            JSON.stringify(festivals),
            2592000,
          ); // 30일 TTL
          this.logger.debug(`[getFestivals] Redis에 저장 완료: ${redisKey}`);
        }

        this.logger.debug(
          `[getFestivals] 최종 반환 항목 수: ${filteredResults.length}`,
        );

        return groupedResults;
      } catch (error) {
        // 오류 발생 시 로그를 남기고 예외를 던짐
        this.logger.error(
          `[getFestivals] 데이터 조회 중 오류 발생: ${
            error instanceof Error ? error.message : error
          }`,
        );
        throw new NotFoundException('축제 정보를 가져오는 데 실패했습니다.');
      }
    } catch (error) {
      this.logger.error(
        `[getFestivals] 데이터 조회 중 오류 발생: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw new NotFoundException('축제 정보를 가져오는 데 실패했습니다.');
    }
  }
}
