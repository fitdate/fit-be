import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsString, IsOptional } from 'class-validator';

export class UserFilterDto {
  @ApiProperty({
    description: '지역',
    example: '서울',
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({
    description: '최소 나이',
    example: 20,
    minimum: 20,
  })
  @IsNumber()
  @Min(20)
  minAge: number = 20;

  @ApiProperty({
    description: '최대 나이',
    example: 60,
    maximum: 60,
  })
  @IsNumber()
  @Max(60)
  maxAge: number = 60;

  @ApiProperty({
    description: '최소 좋아요 수',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  minLikeCount: number = 0;
}
