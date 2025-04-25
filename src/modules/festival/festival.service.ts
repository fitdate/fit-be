import { Injectable, NotFoundException, Inject } from '@nestjs/common';
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
  constructor(
    @Inject(HttpService) private readonly httpService: HttpService,
    private readonly configService: ConfigService<AllConfig>,
  ) {}

  async getFestivalByRegion(
    festivalRegionDto: FestivalRegionDto,
  ): Promise<FestivalDto[]> {
    const regionCode = festivalRegionDto.region;
    const today = dayjs();
    const todayDate = today.format('YYYYMMDD');
    const oneMonthLater = today.add(30, 'day');
    const oneMonthLaterDate = oneMonthLater.format('YYYYMMDD');

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<FestivalResponse>(
          'https://apis.data.go.kr/B551011/KorService1/searchFestival1',
          {
            params: {
              serviceKey: this.configService.getOrThrow(
                'publicApi.festivalApiKey',
                { infer: true },
              ),
              MobileOS: 'ETC', // 고정
              MobileApp: 'TestApp', // 고정
              _type: 'json', // json 응답 원하니까
              areaCode: regionCode, // 지역 코드
              numOfRows: 10, // 한 페이지에 10개
              pageNo: 1, // 1페이지
              listYN: 'Y', // 목록형
              arrange: 'A', // 제목순 정렬
              eventStartDate: todayDate, // 오늘 기준 시작하는 행사
            },
          },
        ),
      );

      const festivals = data?.response?.body?.items?.item ?? [];

      // 날짜 필터링
      const filtered = festivals.filter((festival) => {
        return (
          dayjs(festival.eventstartdate, 'YYYYMMDD').isAfter(todayDate) &&
          dayjs(festival.eventstartdate, 'YYYYMMDD').isBefore(oneMonthLaterDate)
        );
      });

      // 정렬 by startDate (오름차순)
      const sorted = filtered.sort((a, b) => {
        return (
          dayjs(a.eventstartdate, 'YYYYMMDD').unix() -
          dayjs(b.eventstartdate, 'YYYYMMDD').unix()
        );
      });

      // Dto 매핑
      return sorted.map((festival) => ({
        title: festival.title,
        startDate: festival.eventstartdate,
        endDate: festival.eventenddate,
        place: festival.addr1,
        area: festival.areacode,
        thumbnail: festival.firstimage,
      }));
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new NotFoundException(
          `축제 정보를 가져오는 데 실패했습니다: ${error.message}`,
        );
      }
      throw new NotFoundException('축제 정보를 가져오는 데 실패했습니다.');
    }
  }
}
