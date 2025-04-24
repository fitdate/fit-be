import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpdateDatingPreferenceDto {
  @IsNumber()
  @IsOptional()
  @Min(20)
  @Type(() => Number)
  @Transform(({ value }: { value: number | undefined }) =>
    Math.floor(value ?? 20),
  )
  ageMin?: number = 20;

  @IsNumber()
  @IsOptional()
  @Max(50)
  @Type(() => Number)
  @Transform(({ value }: { value: number | undefined }) =>
    Math.floor(value ?? 50),
  )
  ageMax?: number = 50;

  @IsNumber()
  @IsOptional()
  @Min(150)
  @Type(() => Number)
  @Transform(({ value }: { value: number | undefined }) =>
    Math.floor(value ?? 150),
  )
  heightMin?: number = 150;

  @IsNumber()
  @IsOptional()
  @Max(195)
  @Type(() => Number)
  @Transform(({ value }: { value: number | undefined }) =>
    Math.floor(value ?? 195),
  )
  heightMax?: number = 195;

  @IsString()
  @IsOptional()
  region?: string;
}
