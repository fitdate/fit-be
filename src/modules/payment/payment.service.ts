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
      const payment = await this.paymentRepository.findOne({
        where: { orderId },
        relations: ['user'],
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCode.PAYMENT_NOT_FOUND,
          '결제 정보를 찾을 수 없습니다.',
          { orderId },
        );
      }

      if (payment.user.id !== userId) {
        throw new PaymentError(
          PaymentErrorCode.UNAUTHORIZED_ACCESS,
          '결제 접근 권한이 없습니다.',
          { orderId, userId },
        );
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new PaymentError(
          PaymentErrorCode.PAYMENT_ALREADY_PROCESSED,
          '이미 처리된 결제입니다.',
          { orderId, status: payment.status },
        );
      }

      if (payment.amount !== amount) {
        throw new PaymentError(
          PaymentErrorCode.INVALID_AMOUNT,
          '결제 금액이 일치하지 않습니다.',
          { orderId, expected: payment.amount, actual: amount },
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

      await queryRunner.manager.update(
        Payment,
        { orderId },
        { status: PaymentStatus.DONE, paymentKey },
      );

      await queryRunner.commitTransaction();
      return response.data;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof PaymentError) {
        throw error;
      }

      await this.paymentRepository.update(
        { orderId },
        { status: PaymentStatus.FAILED },
      );

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

  // 테스트용 모의 결제 데이터 생성
  async generateMockPayments(): Promise<Payment[]> {
    const users = await this.userRepository.find();
    const paymentMethods = Object.values(PaymentMethod);
    const statuses = Object.values(PaymentStatus);
    const names = [
      '김철수',
      '이영희',
      '박민수',
      '정지은',
      '최동욱',
      '강수진',
      '윤지원',
      '한민준',
      '서예진',
      '임태현',
    ];

    const mockPayments = users.flatMap((user) => {
      const paymentCount = Math.floor(Math.random() * 5) + 1;
      return Array.from({ length: paymentCount }, () => ({
        user,
        amount: Math.floor(Math.random() * 100000) + 10000,
        paymentMethod:
          paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        orderName: `${names[Math.floor(Math.random() * names.length)]}의 결제`,
        orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerName: names[Math.floor(Math.random() * names.length)],
        customerEmail: `${Math.random().toString(36).substr(2, 8)}@example.com`,
        customerMobilePhone: `010${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, '0')}`,
      }));
    });

    return this.paymentRepository.save(mockPayments);
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
