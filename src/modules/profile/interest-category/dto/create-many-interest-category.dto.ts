import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateInterestCategoryDto } from './create-interest-category.dto';

export class CreateManyInterestCategoryDto {
  @ApiProperty({
    description: '생성할 관심 카테고리 목록',
    type: [CreateInterestCategoryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInterestCategoryDto)
  interestCategories: CreateInterestCategoryDto[];
}
