import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInterestLocationDto {
  @ApiProperty({
    description: '시도',
    example: '서울특별시',
  })
  @IsNotEmpty()
  @IsString()
  sido: string;

  @ApiProperty({
    description: '시군구',
    example: '강남구',
  })
  @IsNotEmpty()
  @IsString()
  sigungu: string;

  @ApiProperty({
    description: '읍면동',
    example: '역삼동',
    required: false,
  })
  @IsOptional()
  @IsString()
  eupmyeondong?: string; // 예: 역삼동 (nullable 허용)
}
