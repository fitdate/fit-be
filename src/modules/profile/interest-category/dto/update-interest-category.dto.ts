import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateInterestCategoryDto {
  @ApiProperty({
    description: 'The name of the interest category',
    example: 'Sports',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'The description of the interest category',
    example: 'Sports related activities',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
