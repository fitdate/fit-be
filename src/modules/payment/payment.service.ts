import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import axios from 'axios';
import { TossPaymentResponse } from './types/toss-payment.types';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  // 새로 결제 정보를 생성하는 메서드
  async createPayment(paymentData: Partial<Payment>): Promise<Payment> {
    const payment = this.paymentRepository.create(paymentData);
    return this.paymentRepository.save(payment);
  }

  // 토스페이먼츠 결제를 확인하는 메서드
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

  // 주문 ID로 결제 정보를 조회하는 메서드
  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({ where: { orderId } });
  }
}
