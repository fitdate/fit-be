export type PaymentStatus =
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'DONE'
  | 'CANCELED';

export type PaymentMethod = 'credit_card' | 'kakao_pay' | 'naver_pay';

export interface PaymentStatistics {
  total: number;
  amountRanges: Record<string, { count: number; percentage: number }>;
}

export interface TopPayingUser {
  userId: string;
  name: string;
  nickname: string;
  totalAmount: number;
  paymentCount: number;
  averageAmount: number;
}

export interface PaymentCreateDto {
  orderName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  customerMobilePhone: string;
}

export interface PaymentResponseDto {
  id: string;
  orderId: string;
  orderName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  customerName: string;
  customerEmail: string;
  customerMobilePhone: string;
  createdAt: Date;
}
