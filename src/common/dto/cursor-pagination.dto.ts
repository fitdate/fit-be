import { Transform } from 'class-transformer';
import { IsOptional, IsInt, IsArray, IsString } from 'class-validator';

export class CursorPaginationDto {
  @IsString()
  @IsOptional()
  // id_52, likeCount_20
  cursor?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  // [id_ASC, likeCount_DESC]
  order: string[] = ['id_DESC'];

  @IsInt()
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value))
  take: number = 10;
}
