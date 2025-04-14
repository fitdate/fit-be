import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

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
}
