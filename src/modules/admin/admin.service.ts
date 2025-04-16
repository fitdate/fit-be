import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
import { UserStatisticsService } from '../user/services/user-statistics.service';
import {
  GenderStatistics,
  AgeGroupStatistics,
  LocationStatistics,
} from '../user/types/statistics.types';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly userStatisticsService: UserStatisticsService,
  ) {}

  // 성별 통계 데이터 조회
  async getGenderStatistics(): Promise<GenderStatistics> {
    return this.userStatisticsService.getGenderStatistics();
  }

  // 연령대별 통계 데이터 조회
  async getAgeGroupStatistics(): Promise<AgeGroupStatistics> {
    return this.userStatisticsService.getAgeGroupStatistics();
  }

  // 지역별 통계 데이터 조회
  async getLocationStatistics(): Promise<LocationStatistics> {
    return this.userStatisticsService.getLocationStatistics();
  }
}
