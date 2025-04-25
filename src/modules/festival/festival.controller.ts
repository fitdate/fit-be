import { Controller, Get, Query } from '@nestjs/common';
import { FestivalService } from './festival.service';
import { FestivalDto } from './dto/festival.dto';
import { ApiQuery, ApiOperation } from '@nestjs/swagger';

@Controller('festival')
export class FestivalController {
  constructor(private readonly festivalService: FestivalService) {}

  @ApiOperation({ summary: '지역별 축제 조회' })
  @ApiQuery({
    name: 'region',
    description:
      '지역 코드, 서울: 11, 부산: 26, 대구: 27, 인천: 28, 광주: 29, 대전: 30, 울산: 31, 세종: 36, 경기: 41, 강원: 42, 충북: 43, 충남: 44, 전북: 45, 전남: 46, 경북: 47, 경남: 48, 제주: 50',
    required: true,
  })
  @Get()
  getFestivalByRegion(@Query('region') region: number): Promise<FestivalDto[]> {
    return this.festivalService.getFestivalByRegion(region);
  }
}
