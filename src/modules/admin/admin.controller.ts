import { Controller, Get, Post, Query } from '@nestjs/common';
import { RBAC } from 'src/common/decorator/rbac.decorator';
import { UserRole } from 'src/common/enum/user-role.enum';
import { AdminService } from './admin.service';
import { PaymentService } from '../payment/payment.service';
import {
  PaymentStatistics,
  TopPayingUser,
} from '../payment/types/payment.types';
import {
  GenderStatistics,
  AgeGroupStatistics,
  LocationStatistics,
} from '../user/types/statistics.types';
import { Payment } from '../payment/entities/payment.entity';

@RBAC(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly paymentService: PaymentService,
  ) {}

  // 성별 통계 데이터 조회
  @Get('statistics/gender')
  async getGenderStatistics(): Promise<GenderStatistics> {
    return this.adminService.getGenderStatistics();
  }

  // 연령대별 통계 데이터 조회
  @Get('statistics/age')
  async getAgeGroupStatistics(): Promise<AgeGroupStatistics> {
    return this.adminService.getAgeGroupStatistics();
  }

  // 지역별 통계 데이터 조회
  @Get('statistics/location')
  async getLocationStatistics(): Promise<LocationStatistics> {
    return this.adminService.getLocationStatistics();
  }

  // 결제 통계 데이터 조회
  @Get('statistics/payment')
  async getPaymentStatistics(): Promise<PaymentStatistics> {
    return this.paymentService.getPaymentStatistics();
  }

  // 상위 결제자 목록 조회
  @Get('statistics/top-payers')
  async getTopPayingUsers(
    @Query('limit') limit?: number,
  ): Promise<TopPayingUser[]> {
    return this.paymentService.getTopPayingUsers(limit);
  }

  // 테스트용 모의 결제 데이터 생성
  @Post('mock/payments')
  async generateMockPayments(): Promise<Payment[]> {
    return this.paymentService.generateMockPayments();
  }
}
