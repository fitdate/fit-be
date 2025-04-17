import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import axios from 'axios';
import { TossPaymentResponse } from './types/toss-payment.types';
import { User } from '../user/entities/user.entity';
import {
  PaymentMethod,
  PaymentStatistics,
  PaymentStatus,
  TopPayingUser,
} from './types/payment.types';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 새로운 결제 정보 생성
  async createPayment(paymentData: Partial<Payment>): Promise<Payment> {
    const payment = this.paymentRepository.create(paymentData);
    return this.paymentRepository.save(payment);
  }

  // 토스페이먼츠 결제 확인 처리
  async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number,
  ): Promise<{ data: TossPaymentResponse }> {
    const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;
    const encryptedSecretKey = Buffer.from(`${secretKey}:`).toString('base64');

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
        },
      );

      await this.paymentRepository.update(
        { orderId },
        { status: 'DONE', paymentKey },
      );

      return { data: response.data };
    } catch (error) {
      await this.paymentRepository.update({ orderId }, { status: 'CANCELED' });
      throw error;
    }
  }

  // 주문 ID로 결제 정보 조회
  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({ where: { orderId } });
  }

  // 테스트용 모의 결제 데이터 생성
  async generateMockPayments(): Promise<Payment[]> {
    const users = await this.userRepository.find();
    const paymentMethods: PaymentMethod[] = [
      'credit_card',
      'kakao_pay',
      'naver_pay',
    ];
    const statuses: PaymentStatus[] = ['completed', 'failed', 'refunded'];
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
      const paymentCount = Math.floor(Math.random() * 5) + 1; // 1~5개의 결제
      return Array.from({ length: paymentCount }, () => ({
        user,
        amount: Math.floor(Math.random() * 100000) + 10000, // 10,000원 ~ 110,000원
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

  // 결제 통계 데이터 생성
  async getPaymentStatistics(): Promise<PaymentStatistics> {
    const payments = await this.paymentRepository.find({
      where: { status: 'completed' },
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
        (payment: Payment) => payment.status === 'completed',
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
