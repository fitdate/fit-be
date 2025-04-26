import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { RegionCode } from '../enum/festival-region.enum';
import { IsEnum } from 'class-validator';

export class FestivalDto {
  @ApiProperty({ description: '축제 이름' })
  @IsString()
  title: string;
  @ApiProperty({ description: '축제 시작일' })
  @IsString()
  startDate: string;
  @ApiProperty({ description: '축제 종료일' })
  @IsString()
  endDate: string;
  @ApiProperty({ description: '축제 장소' })
  @IsString()
  address: string;
  @ApiProperty({ description: '축제 지역 코드' })
  @IsString()
  areaCode: string;
  @ApiProperty({ description: '축제 썸네일 이미지 URL' })
  @IsString()
  @IsOptional()
  thumbnail: string;
  @ApiProperty({ description: '축제 네이버 검색 URL' })
  @IsString()
  @IsOptional()
  naverSearchUrl: string | null;
}
