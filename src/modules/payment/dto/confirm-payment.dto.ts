import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({
    description: '토스페이먼츠 결제 키',
    example: '5zJ4xY7m0kODnyRpQWGrN2xqGlNvLrKwv1M9ENjbeoPaZdL6',
  })
  @IsString()
  paymentKey: string;

  @ApiProperty({
    description: '주문 ID',
    example: 'order_1234',
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: '결제 금액',
    example: 50000,
  })
  @IsNumber()
  amount: number;
}
