import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { LocationService } from '../location/location.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { firstValueFrom } from 'rxjs';
import dayjs from 'dayjs';
import { AxiosError } from 'axios';
import { FestivalDto } from './dto/festival.dto';

interface FestivalResponse {
  body: {
    items: {
      item: FestivalItem[];
    };
  };
}

interface FestivalItem {
  title: string;
  eventstartdate: string;
  eventenddate: string;
  addr1: string;
  areacode: string;
  firstimage: string;
}

@Injectable()
export class FestivalService {
  constructor(
    private readonly locationService: LocationService,
    @Inject(HttpService) private readonly httpService: HttpService,
    private readonly configService: ConfigService<AllConfig>,
  ) {}

  async getFestivalByRegion(region: number): Promise<FestivalDto[]> {
    // const regionCode = this.locationService.convertNameToCode(region);
    // if (!regionCode) {
    //   throw new NotFoundException('해당 지역을 찾을 수 없습니다.');
    // }

    const today = dayjs().format('YYYYMMDD');
    const oneWeekLater = dayjs().add(7, 'day').format('YYYYMMDD');

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
              from: today,
              to: oneWeekLater,
              signgucode: region,
              rows: 10,
              cPage: 1,
            },
          },
        ),
      );

      const festivals = data?.body?.items?.item ?? [];

      return festivals.map((festival: FestivalItem) => ({
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
