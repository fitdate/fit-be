import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateIntroductionDto } from './create-introduction.dto';

export class CreateManyIntroductionDto {
  @ApiProperty({
    description: '생성할 소개 목록',
    type: [CreateIntroductionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIntroductionDto)
  introductions: CreateIntroductionDto[];
}
