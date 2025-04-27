import {
  Controller,
  Get,
  Query,
  InternalServerErrorException,
} from '@nestjs/common';
import { MatchResultService } from './match-result.service';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { MatchResultResponseDto } from './dto/match-result.dto';
import { UserId } from '../../common/decorator/get-user.decorator';

@ApiTags('Match Results')
@Controller('match-result')
export class MatchResultController {
  constructor(private readonly matchResultService: MatchResultService) {}

  @ApiOperation({
    summary: '내 매칭 결과 조회',
    description: '로그인한 사용자의 모든 매칭 결과를 조회합니다.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '페이지 번호 (기본값: 1)',
    example: 1,
    default: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '페이지당 항목 수 (기본값: 10)',
    example: 10,
    default: 10,
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
    @UserId() userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: MatchResultResponseDto[]; total: number }> {
    try {
      return await this.matchResultService.getMatchResults(
        userId,
        page || 1,
        limit || 10,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        '매칭 결과 조회 중 오류가 발생했습니다.',
        (error as Error).message,
      );
    }
  }
}
