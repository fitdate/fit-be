import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { firstValueFrom } from 'rxjs';
import * as dayjs from 'dayjs';
import { AxiosError } from 'axios';
import { FestivalDto } from './dto/festival.dto';
import { FestivalRegionDto } from './dto/region.dto';
import { FestivalResponse } from './types/festival.types';

@Injectable()
export class FestivalService {
  private readonly logger = new Logger(FestivalService.name);

  constructor(
    @Inject(HttpService) private readonly httpService: HttpService,
    private readonly configService: ConfigService<AllConfig>,
  ) {}

  async getFestivalByRegion(
    festivalRegionDto: FestivalRegionDto,
  ): Promise<FestivalDto[]> {
    this.logger.debug(
      `[getFestivalByRegion] 시작 - region: ${festivalRegionDto.region}`,
    );

    const today = dayjs();
    const todayDate = today.format('YYYYMMDD');
    const oneMonthLater = today.add(30, 'day');
    const oneMonthLaterDate = oneMonthLater.format('YYYYMMDD');

    this.logger.debug(
      `[getFestivalByRegion] 날짜 범위: ${todayDate} ~ ${oneMonthLaterDate}`,
    );

    try {
      this.logger.debug('[getFestivalByRegion] API 요청 시작');
      const { data } = await firstValueFrom(
        this.httpService.get<FestivalResponse>(
          'https://apis.data.go.kr/B551011/KorService1/searchFestival1',
          {
            params: {
              serviceKey: this.configService.getOrThrow(
                'publicApi.festivalApiKey',
                { infer: true },
              ),
              MobileOS: 'ETC',
              MobileApp: 'fit-date',
              _type: 'json',
              areaCode: festivalRegionDto.region,
              numOfRows: 10,
              pageNo: 1,
              listYN: 'Y',
              arrange: 'A',
              eventStartDate: todayDate,
            },
          },
        ),
      );

      this.logger.debug(`${JSON.stringify(data)}`);
      this.logger.debug(
        `[getFestivalByRegion] API 응답 수신 - 총 항목 수: ${
          data?.response?.body?.items?.item?.length ?? 0
        }`,
      );

      const festivals = data?.response?.body?.items?.item ?? [];

      // 날짜 필터링
      const filtered = festivals.filter((festival) => {
        return (
          dayjs(festival.eventstartdate, 'YYYYMMDD').isAfter(todayDate) &&
          dayjs(festival.eventstartdate, 'YYYYMMDD').isBefore(oneMonthLaterDate)
        );
      });

      this.logger.debug(
        `[getFestivalByRegion] 날짜 필터링 후 항목 수: ${filtered.length}`,
      );

      // 정렬 by startDate (오름차순)
      const sorted = filtered.sort((a, b) => {
        return (
          dayjs(a.eventstartdate, 'YYYYMMDD').unix() -
          dayjs(b.eventstartdate, 'YYYYMMDD').unix()
        );
      });

      // Dto 매핑
      const result = sorted.map((festival) => ({
        title: festival.title,
        startDate: festival.eventstartdate,
        endDate: festival.eventenddate,
        place: festival.addr1,
        area: festival.areacode,
        thumbnail: festival.firstimage,
      }));

      this.logger.debug(
        `[getFestivalByRegion] 최종 반환 항목 수: ${result.length}`,
      );
      result.forEach((festival, index) => {
        this.logger.debug(`[getFestivalByRegion] 축제 ${index + 1} 정보:`);
        this.logger.debug(`- 제목: ${festival.title}`);
        this.logger.debug(`- 시작일: ${festival.startDate}`);
        this.logger.debug(`- 종료일: ${festival.endDate}`);
        this.logger.debug(`- 장소: ${festival.place}`);
        this.logger.debug(`- 지역: ${festival.area}`);
      });

      return result;
    } catch (error) {
      this.logger.error(
        `[getFestivalByRegion] 오류 발생: ${error instanceof AxiosError ? error.message : error}`,
      );
      if (error instanceof AxiosError) {
        throw new NotFoundException(
          `축제 정보를 가져오는 데 실패했습니다: ${error.message}`,
        );
      }
      throw new NotFoundException('축제 정보를 가져오는 데 실패했습니다.');
    }
  }
}
