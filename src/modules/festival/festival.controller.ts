import { Controller, Get, Query } from '@nestjs/common';
import { FestivalService } from './festival.service';
import { FestivalDto } from './dto/festival.dto';
import { ApiQuery, ApiOperation } from '@nestjs/swagger';
import { FestivalRegionDto } from './dto/region.dto';
import { RegionCode } from './enum/festival-region.enum';
import { UserRequestFestivalService } from './service/user-request-festival.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
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

  @ApiOperation({ summary: '사용자 지역 축제 조회' })
  @Get('user-request/:userId')
  getFestivalByUserArea(@UserId() userId: string): Promise<FestivalDto[]> {
    return this.userRequestFestivalService.getFestivalByUserArea(userId);
  }
}
