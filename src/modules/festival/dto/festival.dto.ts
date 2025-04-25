import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

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
  place: string;
  @ApiProperty({ description: '축제 지역' })
  @IsString()
  area: string;
  @ApiProperty({ description: '축제 썸네일' })
  @IsString()
  thumbnail: string;
}
