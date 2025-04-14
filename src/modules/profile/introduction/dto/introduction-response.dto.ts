import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
export class IntroductionResponseDto {
  @ApiProperty({
    example: 'UUID',
    description: '소개 ID',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    description: '저는 이런 사람이에요',
    example: '웃음이 많아요',
  })
  name: string;
}
