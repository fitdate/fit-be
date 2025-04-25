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
    description: '지역 코드',
    required: true,
    example: RegionCode.서울,
    enumName: 'RegionCode',
    style: 'form',
    explode: false,
    schema: {
      type: 'string',
      enum: Object.values(RegionCode),
      default: RegionCode.서울,
    },
  })
  @Get()
  getFestivalByRegion(
    @Query('region') region: RegionCode,
  ): Promise<FestivalDto[]> {
    const festivalRegionDto = new FestivalRegionDto();
    festivalRegionDto.region = region;
    return this.festivalService.getFestivalByRegion(festivalRegionDto);
  }
}
