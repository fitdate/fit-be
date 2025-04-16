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

  async getAgeGroupStatistics(): Promise<AgeGroupStatistics> {
    const users = await this.userRepository.find();
    const total = users.length;

    const ageGroups: AgeGroups = {
      '10대': { count: 0, percentage: 0 },
      '20대': { count: 0, percentage: 0 },
      '30대': { count: 0, percentage: 0 },
      '40대': { count: 0, percentage: 0 },
      '50대 이상': { count: 0, percentage: 0 },
    };

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

  async getLocationStatistics(): Promise<LocationStatistics> {
    const users = await this.userRepository.find();
    const total = users.length;
    const locationMap = new Map<string, LocationStats>();

    users.forEach((user) => {
      if (user.address) {
        const [sido, sigungu] = user.address.split(' ');
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
