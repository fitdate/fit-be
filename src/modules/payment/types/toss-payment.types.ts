import { ApiProperty } from '@nestjs/swagger';

export class TossPaymentResponse {
  @ApiProperty()
  mId: string;

  @ApiProperty()
  version: string;

  @ApiProperty()
  paymentKey: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  orderName: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  method: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  requestedAt: string;

  @ApiProperty()
  approvedAt: string;

  @ApiProperty()
  useEscrow: boolean;

  @ApiProperty()
  lastTransactionKey: string;

  @ApiProperty()
  amount: {
    total: number;
    taxFree: number;
    vat: number;
    point: number;
    discount: number;
  };

  @ApiProperty({ required: false })
  card?: {
    company: string;
    number: string;
    installmentPlanMonths: number;
    isInterestFree: boolean;
    approveNo: string;
    useCardPoint: boolean;
    cardType: string;
    ownerType: string;
    acquireStatus: string;
    receiptUrl: string;
  };
}
