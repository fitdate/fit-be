import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { AxiosError } from 'axios';

interface NaverSearchResponse {
  items: {
    link: string;
  }[];
}

@Injectable()
export class NaverSearchService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly logger = new Logger(NaverSearchService.name);

  constructor(private readonly configService: ConfigService<AllConfig>) {
    this.clientId = this.configService.getOrThrow('social.naver.clientId', {
      infer: true,
    });
    this.clientSecret = this.configService.getOrThrow(
      'social.naver.clientSecret',
      {
        infer: true,
      },
    );
  }

  async getTopFestivalLink(festivalTitle: string): Promise<string | null> {
    const url = 'https://openapi.naver.com/v1/search/webkr.json';

    try {
      const response = await axios.get<NaverSearchResponse>(url, {
        headers: {
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret,
        },
        params: {
          query: festivalTitle,
          display: 1, // 1개만! 제일 위에 있는 결과
        },
        timeout: 5000,
      });

      const items = response.data.items;
      if (items && items.length > 0) {
        return items[0].link; // 제일 상단에 있는 웹사이트 링크
      }
      return null;
    } catch (error) {
      this.logger.warn(
        `[getFestivalByRegion] 네이버 검색 실패: ${festivalTitle}, 기본 URL로 대체`,
      );
      console.error(
        '웹 검색 API 오류:',
        error instanceof AxiosError ? error.message : error,
      );
      return null;
    }
  }
}
