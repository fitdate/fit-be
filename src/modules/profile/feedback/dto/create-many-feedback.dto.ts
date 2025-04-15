import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateFeedbackDto } from './create-feedback.dto';

export class CreateManyFeedbackDto {
  @ApiProperty({
    description: '생성할 피드백 목록',
    type: [CreateFeedbackDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFeedbackDto)
  feedbacks: CreateFeedbackDto[];
}
