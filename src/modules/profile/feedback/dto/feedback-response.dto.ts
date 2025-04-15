import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
export class FeedbackResponseDto {
  @ApiProperty({
    description: '피드백 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: '피드백 내용',
    example: '좋은 매너를 가졌어요',
  })
  name: string;
}
