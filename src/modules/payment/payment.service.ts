import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment } from './entities/payment.entity';
import axios from 'axios';
import { TossPaymentResponse } from './types/toss-payment.types';
import { User } from '../user/entities/user.entity';
import {
  PaymentMethod,
  PaymentStatistics,
  PaymentStatus,
  TopPayingUser,
  PaymentError,
  PaymentErrorCode,
} from './types/payment.types';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // 결제 정보 생성
  async createPayment(paymentData: Partial<Payment>): Promise<Payment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = this.paymentRepository.create({
        ...paymentData,
        status: PaymentStatus.PENDING,
      });
      const savedPayment = await queryRunner.manager.save(Payment, payment);
      await queryRunner.commitTransaction();
      return savedPayment;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      this.logger.error('결제 생성 실패', {
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        paymentData,
      });
      throw new PaymentError(
        PaymentErrorCode.PAYMENT_FAILED,
        '결제 생성에 실패했습니다.',
        { paymentData },
      );
    } finally {
      await queryRunner.release();
    }
  }

  // 토스페이먼츠 결제 확인
  async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number,
    req: Request,
    userId: string,
  ): Promise<TossPaymentResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new PaymentError(
          PaymentErrorCode.USER_NOT_FOUND,
          '사용자를 찾을 수 없습니다.',
          { userId },
        );
      }

      const encryptedSecretKey = Buffer.from(
        `${this.configService.getOrThrow('toss.secretKey', { infer: true })}:`,
      ).toString('base64');

      const response = await axios.post<TossPaymentResponse>(
        'https://api.tosspayments.com/v1/payments/confirm',
        {
          paymentKey,
          orderId,
          amount,
        },
        {
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      );

      // 토스페이먼츠 API 호출 성공 후 DB에 저장
      const payment = this.paymentRepository.create({
        user,
        amount,
        paymentKey,
        orderId,
        status: PaymentStatus.DONE,
        orderName: response.data.orderName,
        customerName: response.data.customerName,
        customerEmail: response.data.customerEmail,
        customerMobilePhone: response.data.customerMobilePhone,
        paymentMethod: response.data.method as PaymentMethod,
      });

      await queryRunner.manager.save(Payment, payment);
      await queryRunner.commitTransaction();
      return response.data;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof PaymentError) {
        throw error;
      }

      this.logger.error(
        `결제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        {
          orderId,
          paymentKey,
          amount,
          userId,
        },
      );

      throw new PaymentError(
        PaymentErrorCode.PAYMENT_FAILED,
        '결제 처리에 실패했습니다.',
        { orderId, paymentKey, amount, userId },
      );
    } finally {
      await queryRunner.release();
    }
  }

  // 주문 ID로 결제 정보 조회
  async getPaymentByOrderId(
    orderId: string,
    userId: string,
  ): Promise<Payment | null> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
      relations: ['user'],
    });

    if (!payment || payment.user.id !== userId) {
      throw new Error('Unauthorized payment access');
    }

    return payment;
  }

  // 결제 통계 데이터 조회
  async getPaymentStatistics(): Promise<PaymentStatistics> {
    const payments = await this.paymentRepository.find({
      where: { status: PaymentStatus.DONE },
    });

    const total = payments.length;
    const amountRanges: Record<string, { count: number; percentage: number }> =
      {
        '1만원 미만': { count: 0, percentage: 0 },
        '1만원-3만원': { count: 0, percentage: 0 },
        '3만원-5만원': { count: 0, percentage: 0 },
        '5만원-10만원': { count: 0, percentage: 0 },
        '10만원 이상': { count: 0, percentage: 0 },
      };

    payments.forEach((payment) => {
      if (payment.amount < 10000) amountRanges['1만원 미만'].count++;
      else if (payment.amount < 30000) amountRanges['1만원-3만원'].count++;
      else if (payment.amount < 50000) amountRanges['3만원-5만원'].count++;
      else if (payment.amount < 100000) amountRanges['5만원-10만원'].count++;
      else amountRanges['10만원 이상'].count++;
    });

    Object.keys(amountRanges).forEach((range) => {
      amountRanges[range].percentage =
        total > 0 ? (amountRanges[range].count / total) * 100 : 0;
    });

    return {
      total,
      amountRanges,
    };
  }

  // 상위 결제자 목록 조회
  async getTopPayingUsers(limit: number = 10): Promise<TopPayingUser[]> {
    const users = await this.userRepository.find({
      relations: ['payments'],
    });

    const userPayments = users.map((user) => {
      const completedPayments = (user.payments || []).filter(
        (payment: Payment) => payment.status === PaymentStatus.DONE,
      );
      const totalAmount = completedPayments.reduce(
        (sum, payment: Payment) => sum + payment.amount,
        0,
      );

      return {
        user,
        totalAmount,
        paymentCount: completedPayments.length,
      };
    });

    return userPayments
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit)
      .map(({ user, totalAmount, paymentCount }) => ({
        userId: user.id,
        name: user.name,
        nickname: user.nickname,
        totalAmount,
        paymentCount,
        averageAmount:
          paymentCount > 0 ? Math.round(totalAmount / paymentCount) : 0,
      }));
  }
}
