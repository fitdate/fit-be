import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Region } from './entities/region.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { REGION_LIST, REGION_NAMES } from './constants/region.constants';

@Injectable()
export class LocationService {
  private readonly regionList = REGION_LIST;
  private readonly regionNames = REGION_NAMES;

  constructor(
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
  ) {}

  getRegionList() {
    // 프론트엔드와의 호환성을 위해 지역 이름만 반환
    return Object.values(this.regionNames);
  }

  getRegionByRegionKey(regionKey: string) {
    const regionCode = this.regionList[regionKey];
    if (!regionCode) {
      throw new NotFoundException('지역을 찾을 수 없습니다.');
    }
    return this.regionNames[regionCode];
  }

  // DB 저장용: 지역 이름을 코드로 변환
  convertNameToCode(regionName: string): string {
    const entry = Object.entries(this.regionNames).find(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_, name]) => name === regionName,
    );
    if (!entry) {
      throw new NotFoundException('지역을 찾을 수 없습니다.');
    }
    return entry[0]; // 코드 반환
  }

  // DB 조회용: 코드를 지역 이름으로 변환
  convertCodeToName(regionCode: string): string {
    const name = this.regionNames[regionCode];
    if (!name) {
      throw new NotFoundException('지역 코드를 찾을 수 없습니다.');
    }
    return name;
  }
}
