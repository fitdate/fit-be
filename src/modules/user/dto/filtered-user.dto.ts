import { IsOptional, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FilteredUsersDto {
  @ApiProperty({
    description: '최소 나이',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Transform(({ value }) =>
    value === undefined || value === null ? 20 : Number(value),
  )
  ageMin?: number;

  @ApiProperty({
    description: '최대 나이',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) =>
    value === undefined || value === null ? 60 : Number(value),
  )
  @IsInt()
  @Min(0)
  ageMax?: number;

  @ApiProperty({
    description: '최소 좋아요 수',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) =>
    value === undefined || value === null ? 0 : Number(value),
  )
  @IsInt()
  @Min(0)
  minLikes?: number;

  @ApiProperty({
    description: '최대 좋아요 수',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) =>
    value === undefined || value === null ? 100 : Number(value),
  )
  @IsInt()
  @Min(0)
  maxLikes?: number;

  @ApiProperty({
    description: '지역',
    required: false,
  })
  @IsOptional()
  region?: string;
}
