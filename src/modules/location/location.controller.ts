import { Controller, Get, Param } from '@nestjs/common';
import { LocationService } from './location.service';
import { ApiResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Region } from './entities/region.entity';

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @ApiOperation({ summary: '지역 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '지역 목록 조회 성공',
    type: Region,
  })
  @Get()
  findAll() {
    return this.locationService.getRegionList();
  }

  @ApiOperation({ summary: '지역 조회' })
  @ApiParam({ name: 'id', description: '지역 ID' })
  @ApiResponse({
    status: 200,
    description: '지역 조회 성공',
    type: Region,
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.locationService.getRegionByRegionKey(id);
  }
}
