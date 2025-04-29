import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpdateDatingPreferenceDto {
  @ApiProperty({
    description: '최소 나이',
    example: 20,
  })
  @IsNumber()
  @IsOptional()
  @Min(20)
  @Type(() => Number)
  @Transform(({ value }: { value: number | undefined }) =>
    Math.floor(value ?? 20),
  )
  ageMin?: number = 20;

  @ApiProperty({
    description: '최대 나이',
    example: 50,
  })
  @IsNumber()
  @IsOptional()
  @Max(50)
  @Type(() => Number)
  @Transform(({ value }: { value: number | undefined }) =>
    Math.floor(value ?? 50),
  )
  ageMax?: number = 50;

  @ApiProperty({
    description: '최소 키',
    example: 150,
  })
  @IsNumber()
  @IsOptional()
  @Min(150)
  @Type(() => Number)
  @Transform(({ value }: { value: number | undefined }) =>
    Math.floor(value ?? 150),
  )
  heightMin?: number = 150;

  @ApiProperty({
    description: '최대 키',
    example: 195,
  })
  @IsNumber()
  @IsOptional()
  @Max(195)
  @Type(() => Number)
  @Transform(({ value }: { value: number | undefined }) =>
    Math.floor(value ?? 195),
  )
  heightMax?: number = 195;

  @ApiProperty({
    description: '지역',
    example: '서울',
  })
  @IsString()
  @IsOptional()
  region?: string;
}
