import { Controller, Get, Query } from '@nestjs/common';
import { FestivalService } from './festival.service';
import { FestivalDto } from './dto/festival.dto';
import { ApiQuery, ApiOperation } from '@nestjs/swagger';
import { FestivalRegionDto } from './dto/region.dto';
import { RegionCode } from './enum/festival-region.enum';
@Controller('festival')
export class FestivalController {
  constructor(private readonly festivalService: FestivalService) {}

  @ApiOperation({ summary: '지역별 축제 조회' })
  @ApiQuery({
    name: 'region',
    enum: RegionCode,
    description:
      '지역 코드, 서울: 11, 부산: 26, 대구: 27, 인천: 28, 광주: 29, 대전: 30, 울산: 31, 세종: 36, 경기: 41, 강원: 42, 충북: 43, 충남: 44, 전북: 45, 전남: 46, 경북: 47, 경남: 48, 제주: 50',
    required: true,
    example: RegionCode.서울,
  })
  @Get()
  getFestivalByRegion(
    @Query('region') festivalRegionDto: FestivalRegionDto,
  ): Promise<FestivalDto[]> {
    return this.festivalService.getFestivalByRegion(festivalRegionDto);
  }
}
