import {
  Controller,
  Get,
  Query,
  InternalServerErrorException,
} from '@nestjs/common';
import { MatchResultService } from './match-result.service';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { MatchResultResponseDto } from './dto/match-result.dto';

@ApiTags('매칭 결과')
@Controller('all-match-result')
export class MatchResultController {
  constructor(private readonly matchResultService: MatchResultService) {}

  @ApiOperation({
    summary: '전체 매칭 결과 조회',
    description: '모든 매칭된 사용자들의 프로필 정보를 조회합니다.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '페이지 번호 (고정값: 1)',
    example: 1,
    enum: [1],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '페이지당 항목 수 (고정값: 10)',
    example: 10,
    enum: [10],
  })
  @ApiResponse({
    status: 200,
    description: '매칭 결과 조회 성공',
    type: [MatchResultResponseDto],
  })
  @ApiResponse({
    status: 500,
    description: '서버 에러',
  })
  @Get()
  async getMatchResults(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ data: MatchResultResponseDto[]; total: number }> {
    try {
      return await this.matchResultService.getMatchResults(page, limit);
    } catch (error) {
      throw new InternalServerErrorException(
        '매칭 결과 조회 중 오류가 발생했습니다.',
        (error as Error).message,
      );
    }
  }
}
