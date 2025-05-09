import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment } from './entities/payment.entity';
import axios, { AxiosError } from 'axios';
import { TossPaymentResponse } from './types/toss-payment.types';
import { User } from '../user/entities/user.entity';
import {
  PaymentMethod,
  PaymentStatistics,
  PaymentStatus,
  TopPayingUser,
  PaymentError,
  PaymentErrorCode,
  mapTossPaymentMethod,
} from './types/payment.types';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';

// 결제 상품 id-quantity 매핑 상수
const PAYMENT_PRODUCTS = [
  { id: 1, quantity: 30 },
  { id: 2, quantity: 60 },
  { id: 3, quantity: 120 },
  { id: 4, quantity: 240 },
  { id: 5, quantity: 500 },
];

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
    private readonly userService: UserService,
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
    customerEmail: string,
    customerName: string,
    customerMobilePhone: string,
  ): Promise<TossPaymentResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(
        `결제 승인 시도: ${JSON.stringify({ paymentKey, orderId, amount, userId })}`,
      );

      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        this.logger.error(`사용자를 찾을 수 없음: ${userId}`);
        throw new PaymentError(
          PaymentErrorCode.USER_NOT_FOUND,
          '사용자를 찾을 수 없습니다.',
          { userId },
        );
      }

      const secretKey = this.configService.get<string>(
        'TOSS_PAYMENTS_SECRET_KEY',
      );
      if (!secretKey) {
        this.logger.error('토스페이먼츠 시크릿 키가 설정되지 않음');
        throw new PaymentError(
          PaymentErrorCode.CONFIGURATION_ERROR,
          '결제 설정이 올바르지 않습니다.',
        );
      }

      const encryptedSecretKey = Buffer.from(`${secretKey}:`).toString(
        'base64',
      );

      try {
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

        this.logger.log(
          `토스페이먼츠 API 응답: ${JSON.stringify(response.data)}`,
        );

        // 토스페이먼츠 API 호출 성공 후 DB에 저장
        const payment = this.paymentRepository.create({
          user,
          amount,
          paymentKey,
          orderId,
          status: PaymentStatus.DONE,
          orderName: response.data.orderName,
          customerName,
          customerEmail,
          customerMobilePhone,
          paymentMethod: mapTossPaymentMethod(response.data.method),
        });

        await queryRunner.manager.save(Payment, payment);

        // === 커피 증가 로직 (id별) ===
        const product = PAYMENT_PRODUCTS.find(
          (p) => p.id === parseInt(orderId),
        );
        if (product) {
          await this.userService.updateCoffee(
            userId,
            (user.coffee || 0) + product.quantity,
          );
          this.logger.log(
            `커피 ${product.quantity}개 지급 완료 (userId: ${userId}, 상품 id: ${orderId})`,
          );
        } else {
          this.logger.warn(`알 수 없는 상품 id: ${orderId}`);
        }
        // =========================

        await queryRunner.commitTransaction();
        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        this.logger.error('토스페이먼츠 API 호출 실패', {
          error: axiosError.response?.data || axiosError.message,
          status: axiosError.response?.status,
          paymentKey,
          orderId,
          amount,
        });
        throw new PaymentError(
          PaymentErrorCode.PAYMENT_FAILED,
          '토스페이먼츠 결제 처리에 실패했습니다.',
          {
            paymentKey,
            orderId,
            amount,
            error: axiosError.response?.data || axiosError.message,
          },
        );
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof PaymentError) {
        throw error;
      }

      this.logger.error('결제 처리 중 예상치 못한 오류 발생', {
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        stack: error instanceof Error ? error.stack : undefined,
        orderId,
        paymentKey,
        amount,
        userId,
      });

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
