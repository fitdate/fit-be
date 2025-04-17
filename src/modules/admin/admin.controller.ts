import { Controller, Get, Post, Query } from '@nestjs/common';
import { RBAC } from 'src/common/decorator/rbac.decorator';
import { UserRole } from 'src/common/enum/user-role.enum';
import { AdminService } from './admin.service';
import { PaymentService } from 'src/modules/payment/payment.service';
import {
  PaymentStatistics,
  TopPayingUser,
} from 'src/modules/payment/types/payment.types';
import {
  GenderStatistics,
  AgeGroupStatistics,
  LocationStatistics,
} from 'src/modules/user/types/statistics.types';
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin')
@RBAC(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly paymentService: PaymentService,
  ) {}

  @ApiOperation({ summary: '성별 통계 데이터 조회' })
  @ApiResponse({ status: 200, description: '성별 통계 데이터 반환' })
  @Get('statistics/gender')
  async getGenderStatistics(): Promise<GenderStatistics> {
    return this.adminService.getGenderStatistics();
  }

  @ApiOperation({ summary: '연령대별 통계 데이터 조회' })
  @ApiResponse({ status: 200, description: '연령대별 통계 데이터 반환' })
  @Get('statistics/age')
  async getAgeGroupStatistics(): Promise<AgeGroupStatistics> {
    return this.adminService.getAgeGroupStatistics();
  }

  @ApiOperation({ summary: '지역별 통계 데이터 조회' })
  @ApiResponse({ status: 200, description: '지역별 통계 데이터 반환' })
  @Get('statistics/location')
  async getLocationStatistics(): Promise<LocationStatistics> {
    return this.adminService.getLocationStatistics();
  }

  @ApiOperation({ summary: '결제 통계 데이터 조회' })
  @ApiResponse({ status: 200, description: '결제 통계 데이터 반환' })
  @Get('statistics/payment')
  async getPaymentStatistics(): Promise<PaymentStatistics> {
    return this.paymentService.getPaymentStatistics();
  }

  @ApiOperation({ summary: '상위 결제자 목록 조회' })
  @ApiResponse({ status: 200, description: '상위 결제자 목록 반환' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '조회할 상위 결제자 수',
  })
  @Get('statistics/top-payers')
  async getTopPayingUsers(
    @Query('limit') limit?: number,
  ): Promise<TopPayingUser[]> {
    return this.paymentService.getTopPayingUsers(limit);
  }

  @ApiOperation({ summary: '테스트용 모의 결제 데이터 생성' })
  @ApiResponse({ status: 201, description: '생성된 모의 결제 데이터 반환' })
  @Post('mock/payments')
  async generateMockPayments(): Promise<Payment[]> {
    return this.paymentService.generateMockPayments();
  }
}
