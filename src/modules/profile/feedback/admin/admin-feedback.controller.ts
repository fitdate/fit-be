import { Controller, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FeedbackService } from './admin-feedback.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { UpdateFeedbackDto } from '../dto/update-feedback.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Feedback } from '../entities/feedback.entity';
import { RBAC } from 'src/common/decorator/rbac.decorator';
import { UserRole } from 'src/common/enum/user-role.enum';
import { FeedbackResponseDto } from '../dto/feedback-response.dto';
@RBAC(UserRole.ADMIN)
@ApiTags('admin/feedback')
@Controller('admin/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: '피드백 생성' })
  @ApiResponse({
    status: 201,
    description: '피드백이 성공적으로 생성됨',
    type: [Feedback],
  })
  @ApiResponse({ status: 409, description: '이미 존재하는 피드백' })
  createFeedback(
    @Body() feedbackCreateDto: CreateFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    return this.feedbackService.createFeedback(feedbackCreateDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '피드백 수정' })
  @ApiResponse({
    status: 200,
    description: '피드백이 성공적으로 수정됨',
    type: [Feedback],
  })
  @ApiResponse({ status: 404, description: '존재하지 않는 피드백' })
  @ApiResponse({ status: 409, description: '이미 존재하는 피드백' })
  updateFeedback(
    @Param('id') id: string,
    @Body() feedbackUpdateDto: UpdateFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    return this.feedbackService.updateFeedback(id, feedbackUpdateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '피드백 삭제' })
  @ApiResponse({
    status: 200,
    description: '피드백이 성공적으로 삭제됨',
    type: [Feedback],
  })
  @ApiResponse({ status: 404, description: '존재하지 않는 피드백' })
  deleteFeedback(@Param('id') id: string): Promise<FeedbackResponseDto> {
    return this.feedbackService.deleteFeedback(id);
  }
}
