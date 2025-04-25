import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RegionCode } from '../enum/festival-region.enum';

export class FestivalRegionDto {
  @ApiProperty({
    description: '지역 코드',
    enum: RegionCode,
  })
  @IsEnum(RegionCode)
  region: RegionCode;
}
