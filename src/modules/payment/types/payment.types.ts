export enum PaymentStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  KAKAO_PAY = 'KAKAO_PAY',
  NAVER_PAY = 'NAVER_PAY',
}

export enum PaymentErrorCode {
  UNAUTHORIZED_ACCESS = 'PAYMENT_001',
  INVALID_AMOUNT = 'PAYMENT_002',
  PAYMENT_NOT_FOUND = 'PAYMENT_003',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_004',
  PAYMENT_FAILED = 'PAYMENT_005',
  USER_NOT_FOUND = 'PAYMENT_006',
}

export class PaymentError extends Error {
  constructor(
    public readonly code: PaymentErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

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
