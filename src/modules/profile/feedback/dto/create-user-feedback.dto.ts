import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class CreateUserFeedbackDto {
  @ApiProperty({
    description: '프로필 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4')
  profileId: string;

  @ApiProperty({
    description: '피드백 ID 목록',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  feedbackIds: string[];

  @ApiProperty({
    description: '피드백 이름 목록',
    example: ['좋은 매너', '친절한 서비스'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  feedbackNames: string[];
}
