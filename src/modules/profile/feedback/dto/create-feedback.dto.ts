import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({
    description: '피드백 내용',
    example: '좋은 매너를 가졌어요',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
