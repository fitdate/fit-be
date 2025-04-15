import { Controller, Get, Param } from '@nestjs/common';
import { MbtiService } from './mbti.service';
import { MbtiType } from './constants/mbti.constants';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Mbti } from './entities/mbti.entity';
import { MbtiRecommendResponse } from './dto/mbti-recommend.response.dto';

@Controller('mbti')
export class MbtiController {
  constructor(private readonly mbtiService: MbtiService) {}

  @ApiOperation({ summary: '유저 MBTI 조회' })
  @ApiParam({ name: 'profileId', description: '유저 프로필 ID' })
  @ApiResponse({
    status: 200,
    description: '유저 MBTI 조회 성공',
    type: Mbti,
  })
  @Get('profile/:profileId')
  getUserMbti(@Param('profileId') profileId: string) {
    return this.mbtiService.getUserMbti(profileId);
  }

  @ApiOperation({ summary: '유저 MBTI 추천 목록 조회' })
  @ApiParam({ name: 'mbti', description: 'MBTI 타입' })
  @ApiResponse({
    status: 200,
    description: '유저 MBTI 추천 목록 조회 성공',
    type: MbtiRecommendResponse,
  })
  @Get('recommend/:mbti')
  getUserMbtiRecommendList(@Param('mbti') mbti: MbtiType) {
    return this.mbtiService.getUserMbtiRecommendList(mbti);
  }
}
