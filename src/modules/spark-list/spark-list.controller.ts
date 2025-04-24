import { Controller, Get } from '@nestjs/common';
import { SparkListService } from './spark-list.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { ApiResponse } from '@nestjs/swagger';
import { ApiOperation } from '@nestjs/swagger';

@Controller('spark-list')
export class SparkListController {
  constructor(private readonly sparkListService: SparkListService) {}

  @ApiOperation({ summary: '스파크 리스트 조회' })
  @ApiResponse({
    status: 200,
    description: '스파크 리스트 조회 성공',
  })
  @Get()
  getSparkList(@UserId() userId: string) {
    return this.sparkListService.getSparkList(userId);
  }
}
