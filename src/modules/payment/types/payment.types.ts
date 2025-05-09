export enum PaymentStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CARD = 'CARD', // 신용/체크카드
  TRANSFER = 'TRANSFER', // 퀵계좌이체
  TOSSPAY = 'TOSSPAY', // 토스페이
  PAYCO = 'PAYCO', // 페이코
  KAKAO_PAY = 'KAKAO_PAY', // 카카오페이
  NAVER_PAY = 'NAVER_PAY', // 네이버페이
  PHONE = 'PHONE', // 휴대폰
}

export enum PaymentErrorCode {
  UNAUTHORIZED_ACCESS = 'PAYMENT_001',
  INVALID_AMOUNT = 'PAYMENT_002',
  PAYMENT_NOT_FOUND = 'PAYMENT_003',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_004',
  PAYMENT_FAILED = 'PAYMENT_005',
  USER_NOT_FOUND = 'PAYMENT_006',
  CONFIGURATION_ERROR = 'PAYMENT_007',
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

export function mapTossPaymentMethod(tossMethod: string): PaymentMethod {
  const methodMap: Record<string, PaymentMethod> = {
    카드: PaymentMethod.CARD,
    계좌이체: PaymentMethod.TRANSFER,
    토스페이: PaymentMethod.TOSSPAY,
    페이코: PaymentMethod.PAYCO,
    카카오페이: PaymentMethod.KAKAO_PAY,
    네이버페이: PaymentMethod.NAVER_PAY,
    휴대폰: PaymentMethod.PHONE,
  };

  return methodMap[tossMethod] || PaymentMethod.CARD;
}
