import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import {
  AgeGroups,
  GenderStatistics,
  AgeGroupStatistics,
  LocationStatistics,
  LocationStats,
} from '../types/statistics.types';

@Injectable()
export class UserStatisticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 사용자 성별 통계를 조회합니다.
   * @returns 전체 사용자 수, 남성/여성 수와 비율을 포함한 통계 정보
   */
  async getGenderStatistics(): Promise<GenderStatistics> {
    const users = await this.userRepository.find();
    const total = users.length;
    const maleCount = users.filter((user) => user.gender === 'male').length;
    const femaleCount = users.filter((user) => user.gender === 'female').length;

    return {
      total,
      male: {
        count: maleCount,
        percentage: total > 0 ? (maleCount / total) * 100 : 0,
      },
      female: {
        count: femaleCount,
        percentage: total > 0 ? (femaleCount / total) * 100 : 0,
      },
    };
  }

  /**
   * 사용자 연령대별 통계를 조회합니다.
   * @returns 전체 사용자 수, 10대/20대/30대/40대/50대 이상의 수와 비율을 포함한 통계 정보
   */
  async getAgeGroupStatistics(): Promise<AgeGroupStatistics> {
    const users = await this.userRepository.find();
    const total = users.length;

    // 연령대별 통계를 저장할 객체 초기화
    const ageGroups: AgeGroups = {
      '10대': { count: 0, percentage: 0 },
      '20대': { count: 0, percentage: 0 },
      '30대': { count: 0, percentage: 0 },
      '40대': { count: 0, percentage: 0 },
      '50대 이상': { count: 0, percentage: 0 },
    };

    // 각 사용자의 생년월일을 기반으로 연령대 계산
    users.forEach((user) => {
      if (user.birthday) {
        const birthYear = parseInt(user.birthday.substring(0, 4));
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;

        if (age < 20) ageGroups['10대'].count++;
        else if (age < 30) ageGroups['20대'].count++;
        else if (age < 40) ageGroups['30대'].count++;
        else if (age < 50) ageGroups['40대'].count++;
        else ageGroups['50대 이상'].count++;
      }
    });

    // 각 연령대의 비율 계산
    Object.keys(ageGroups).forEach((group) => {
      ageGroups[group as keyof AgeGroups].percentage =
        total > 0
          ? (ageGroups[group as keyof AgeGroups].count / total) * 100
          : 0;
    });

    return {
      total,
      ageGroups,
    };
  }

  /**
   * 사용자 지역별 통계를 조회합니다.
   * @returns 전체 사용자 수, 시도/시군구별 사용자 수와 비율을 포함한 통계 정보
   */
  async getLocationStatistics(): Promise<LocationStatistics> {
    const users = await this.userRepository.find();
    const total = users.length;
    const locationMap = new Map<string, LocationStats>();

    // 각 사용자의 지역 정보를 기반으로 통계 계산
    users.forEach((user) => {
      if (user.region) {
        const [sido, sigungu] = user.region.split(' ');
        const key = `${sido}-${sigungu}`;
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            sido,
            sigungu,
            count: 0,
            percentage: 0,
          });
        }
        const stats = locationMap.get(key)!;
        stats.count++;
      }
    });

    // 각 지역의 비율 계산
    const locationStats: LocationStats[] = Array.from(locationMap.values());
    locationStats.forEach((stats) => {
      stats.percentage = total > 0 ? (stats.count / total) * 100 : 0;
    });

    return {
      total,
      locations: locationStats,
    };
  }
}
