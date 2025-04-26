import { Controller, Get, Query } from '@nestjs/common';
import { FestivalService } from './festival.service';
import { FestivalDto } from './dto/festival.dto';
import { ApiQuery, ApiOperation } from '@nestjs/swagger';
import { FestivalRegionDto } from './dto/region.dto';
import { RegionCode } from './enum/festival-region.enum';
import { UserRequestFestivalService } from './user-request-festival.service';
@Controller('festival')
export class FestivalController {
  constructor(
    private readonly festivalService: FestivalService,
    private readonly userRequestFestivalService: UserRequestFestivalService,
  ) {}

  @ApiOperation({ summary: '전체 축제 조회' })
  @Get()
  getFestivals(): Promise<Record<string, FestivalDto[]>> {
    return this.festivalService.getFestivals();
  }

  @ApiOperation({ summary: '지역 이름으로 축제 조회' })
  @ApiQuery({
    name: 'areaName',
    description: '지역 이름 (예: 서울, 부산, 대구 등)',
    required: true,
    schema: {
      type: 'string',
      enum: Object.keys(RegionCode),
      example: '서울',
    },
  })
  @Get('user-request')
  getFestivalsByAreaName(
    @Query() regionDto: FestivalRegionDto,
  ): Promise<FestivalDto[]> {
    return this.userRequestFestivalService.getFestivalsByAreaName(
      regionDto.region,
    );
  }
}
