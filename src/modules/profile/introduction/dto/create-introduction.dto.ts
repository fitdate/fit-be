import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateIntroductionDto {
  @ApiProperty({
    description: '저는 이런 사람이에요',
    example: '웃음이 많아요',
  })
  @IsString()
  name: string;
}
