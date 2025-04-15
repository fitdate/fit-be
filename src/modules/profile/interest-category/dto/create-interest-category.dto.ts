import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateInterestCategoryDto {
  @ApiProperty({
    description: 'The name of the interest category',
    example: 'Sports',
  })
  @IsString()
  name: string;
}
