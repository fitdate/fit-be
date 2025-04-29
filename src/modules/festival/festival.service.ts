import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { FestivalDto } from './dto/festival.dto';
import { FestivalItem, FestivalResponse } from './types/festival.types';
import { format } from 'date-fns';
import { NaverSearchService } from './service/naver-search.service';
import { AllConfig } from 'src/common/config/config.types';
import { addMonths, isWithinInterval, parse } from 'date-fns';
import { RedisService } from '../redis/redis.service';
import { REGION_VALUES } from '../location/constants/region.constants';
import { FestivalApiResponse } from './types/festival.types';

@Injectable()
export class FestivalService {
  private readonly logger = new Logger(FestivalService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly naverSearchService: NaverSearchService,
    private readonly redisService: RedisService,
  ) {}

  // Cron
  @Cron('0 9-17 * * 1-5') // 월~금, 9시~17시 매 정각 실행
  async handleCron() {
    this.logger.debug('[handleCron] 1시간마다 getFestivalByRegion 실행 시작');
    try {
      const regionCodes = REGION_VALUES;
      this.logger.debug(
        `[handleCron] 지역 코드: ${JSON.stringify(regionCodes)}`,
      );

      // 각 지역별로 독립적으로 처리
      for (const regionCode of regionCodes) {
        try {
          await this.updateRegionFestivals(regionCode);
        } catch (error) {
          this.logger.error(
            `[handleCron] 지역 ${regionCode} 업데이트 실패: ${
              error instanceof Error ? error.message : error
            }`,
          );
          // 한 지역 실패해도 다른 지역은 계속 처리
          continue;
        }
      }
    } catch (error) {
      this.logger.error(
        `[handleCron] Cron 작업 중 오류 발생: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async updateRegionFestivals(regionCode: string) {
    const redisKey = `festivals:${regionCode}`;
    const existingData = await this.redisService.get(redisKey);
    const existingFestivals = existingData
      ? (JSON.parse(existingData) as FestivalDto[])
      : [];

    // 해당 지역의 새로운 축제 데이터만 가져오기
    const newFestivals = await this.getNewFestivalsForRegion(regionCode);

    // 기존 데이터와 새 데이터 병합 및 정렬
    const mergedFestivals = this.mergeAndSortFestivals(
      existingFestivals,
      newFestivals,
    );

    // Redis 업데이트
    await this.redisService.set(
      redisKey,
      JSON.stringify(mergedFestivals),
      2592000,
    );
    this.logger.debug(
      `[updateRegionFestivals] 지역 ${regionCode} 캐시 업데이트 완료`,
    );
  }

  private async getNewFestivalsForRegion(
    regionCode: string,
  ): Promise<FestivalDto[]> {
    const today = format(new Date(), 'yyyyMMdd');
    const params = {
      serviceKey: this.configService.getOrThrow(
        'publicApi.festivalDecodingApiKey',
        { infer: true },
      ),
      MobileOS: 'ETC',
      MobileApp: 'AppTest',
      numOfRows: '100',
      pageNo: '1',
      _type: 'json',
      listYN: 'Y',
      arrange: 'D',
      eventStartDate: today,
      areaCode: regionCode,
    };

    const response = await firstValueFrom(
      this.httpService.get<FestivalApiResponse>(
        'https://apis.data.go.kr/B551011/KorService1/searchFestival1',
        { params },
      ),
    );

    const festivals = response.data.response?.body?.items?.item || [];
    const filteredFestivals = festivals.filter((festival) =>
      this.isWithinOneMonth(festival.eventenddate),
    );

    const settledResults = await Promise.allSettled(
      filteredFestivals.map((festival) =>
        this.getFestivalWithNaverSearchUrl({
          title: festival.title,
          eventstartdate: festival.eventstartdate,
          eventenddate: festival.eventenddate,
          addr1: festival.addr1,
          areacode: festival.areacode,
          areaCode: festival.areacode,
          firstimage2: festival.firstimage2,
        }),
      ),
    );

    return settledResults
      .filter(
        (result): result is PromiseFulfilledResult<FestivalDto> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value);
  }

  private mergeAndSortFestivals(
    existing: FestivalDto[],
    newFestivals: FestivalDto[],
  ): FestivalDto[] {
    // 중복 제거 (동일한 title과 startDate를 가진 축제)
    const uniqueFestivals = [...existing];
    for (const newFest of newFestivals) {
      const isDuplicate = existing.some(
        (existingFest) =>
          existingFest.title === newFest.title &&
          existingFest.startDate === newFest.startDate,
      );
      if (!isDuplicate) {
        uniqueFestivals.push(newFest);
      }
    }

    // 종료된 축제 제거
    const activeFestivals = uniqueFestivals.filter((festival) =>
      this.isWithinOneMonth(festival.endDate),
    );

    // 최신순 정렬
    return activeFestivals.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateB.getTime() - dateA.getTime();
    });
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
        areaCode: festival.areaCode,
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
        areaCode: festival.areaCode,
        thumbnail: festival.firstimage2,
        naverSearchUrl: `https://search.naver.com/search.naver?query=${encodeURIComponent(festival.title)}`,
      };
    }
  }

  // endDate가 오늘부터 1달
  private isWithinOneMonth(endDate: string): boolean {
    const parsedEndDate = parse(endDate, 'yyyyMMdd', new Date());
    const today = new Date();
    const oneMonthLater = addMonths(today, 1);
    return isWithinInterval(parsedEndDate, {
      start: today,
      end: oneMonthLater,
    });
  }

  // 전체 축제 조회
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
        // 1달 이내 종료되는 축제만 먼저 필터링
        const filteredFestivals = allFestivals.filter((festival) =>
          this.isWithinOneMonth(festival.eventenddate),
        );

        // 필터링된 축제에 대해서만 네이버 URL 생성
        const settledResults = await Promise.allSettled(
          filteredFestivals.map((festival) =>
            this.getFestivalWithNaverSearchUrl(festival),
          ),
        );

        const processedResults = settledResults
          .filter(
            (result): result is PromiseFulfilledResult<FestivalDto> =>
              result.status === 'fulfilled',
          )
          .map((result) => result.value);

        // 지역별로 매핑
        const groupedResults = processedResults.reduce<
          Record<string, FestivalDto[]>
        >((acc, festival) => {
          const areaCode = festival.areaCode;
          if (!acc[areaCode]) {
            acc[areaCode] = [];
          }
          acc[areaCode].push(festival);
          return acc;
        }, {});

        // Redis에 저장하기 전에 각 지역별로 최신순 정렬
        for (const [areaCode, festivals] of Object.entries(groupedResults)) {
          const sortedFestivals = festivals.sort((a, b) => {
            const dateA = new Date(a.startDate);
            const dateB = new Date(b.startDate);
            return dateB.getTime() - dateA.getTime();
          });

          const redisKey = `festivals:${areaCode}`;
          await this.redisService.set(
            redisKey,
            JSON.stringify(sortedFestivals),
            2592000,
          );
          this.logger.debug(`[getFestivals] Redis에 저장 완료: ${redisKey}`);
        }

        this.logger.debug(
          `[getFestivals] 최종 반환 항목 수: ${processedResults.length}`,
        );

        return groupedResults;
      } catch (error) {
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
