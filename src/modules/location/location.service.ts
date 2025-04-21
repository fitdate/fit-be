import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Region } from './entities/region.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { REGION_LIST } from './constants/region.constants';
@Injectable()
export class LocationService {
  private readonly regionList = REGION_LIST;
  constructor(
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
  ) {}

  getRegionList() {
    return Object.values(REGION_LIST);
  }

  getRegionByRegionKey(regionKey: string) {
    const region = this.regionList[regionKey];
    if (!region) {
      throw new NotFoundException('지역을 찾을 수 없습니다.');
    }
    return region;
  }
}
