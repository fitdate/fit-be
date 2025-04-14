import { Controller, Get, Param } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Feedback } from '../entities/feedback.entity';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: '모든 피드백 조회' })
  @ApiResponse({
    status: 200,
    description: '피드백 목록 반환',
    type: [Feedback],
  })
  findAllFeedback() {
    return this.feedbackService.findAllFeedback();
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 피드백 조회' })
  @ApiResponse({
    status: 200,
    description: '피드백 정보 반환',
    type: [Feedback],
  })
  @ApiResponse({ status: 204, description: '결과 없음' })
  searchFeedbacks(@Param('name') name: string) {
    return this.feedbackService.searchFeedbacks(name);
  }
}
