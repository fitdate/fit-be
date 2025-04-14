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

  async createPayment(paymentData: Partial<Payment>): Promise<Payment> {
    const payment = this.paymentRepository.create(paymentData);
    return this.paymentRepository.save(payment);
  }

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

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({ where: { orderId } });
  }
}
