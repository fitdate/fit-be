import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { FestivalDto } from './dto/festival.dto';
import { FestivalRegionDto } from './dto/region.dto';
import { FestivalResponse } from './types/festival.types';
import { format } from 'date-fns';
import { NaverSearchService } from './naver-search.service';
@Injectable()
export class FestivalService {
  private readonly logger = new Logger(FestivalService.name);

  constructor(
    @Inject(HttpService) private readonly httpService: HttpService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly naverSearchService: NaverSearchService,
  ) {}

  async getFestivalByRegion(
    festivalRegionDto: FestivalRegionDto,
  ): Promise<FestivalDto[]> {
    try {
      this.logger.debug('[getFestivalByRegion] API 요청 시작');
      const today = format(new Date(), 'yyyyMMdd');

      const serviceKey = `${this.configService.getOrThrow(
        'publicApi.festivalDecodingApiKey',
        {
          infer: true,
        },
      )}`;

      const params = {
        serviceKey,
        MobileOS: 'ETC',
        MobileApp: 'AppTest',
        _type: 'json',
        listYN: 'Y',
        arrange: 'A',
        eventStartDate: `${today}`,
      };

      this.logger.debug(
        `[getFestivalByRegion] 요청 파라미터: ${JSON.stringify(params)}`,
      );

      const response: AxiosResponse<FestivalResponse> = await firstValueFrom(
        this.httpService.get(
          'https://apis.data.go.kr/B551011/KorService1/searchFestival1',
          { params },
        ),
      );

      const data = response.data;
      this.logger.debug(`${JSON.stringify(data)}`);

      if (!data.response?.body?.items?.item) {
        this.logger.warn(
          `[getFestivalByRegion] 해당 지역(${festivalRegionDto.region})에 축제 정보가 없습니다.`,
        );
        return [];
      }

      const festivals = data.response.body.items.item;
      this.logger.debug(
        `[getFestivalByRegion] API 응답 수신 - 총 항목 수: ${festivals.length}`,
      );

      const searchresult = await Promise.all(
        festivals.map(async (festival) => {
          const searchQuery = `${festival.title}`;
          let naverSearchUrl =
            await this.naverSearchService.getTopFestivalLink(searchQuery);
          if (!naverSearchUrl) {
            naverSearchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(
              festival.title,
            )}`;
          }
          return {
            title: festival.title,
            startDate: festival.eventstartdate,
            endDate: festival.eventenddate,
            place: festival.addr1,
            area: festival.areacode,
            areaCode: festival.areacode,
            thumbnail: festival.firstimage2,
            naverSearchUrl,
          };
        }),
      );

      this.logger.debug(
        `[getFestivalByRegion] 최종 반환 항목 수: ${searchresult.length}`,
      );

      return searchresult;
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
