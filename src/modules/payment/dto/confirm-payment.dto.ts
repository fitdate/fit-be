import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({
    description: '토스페이먼츠 결제 키',
    example: '5zJ4xY7m0kODnyRpQWGrN2xqGlNvLrKwv1M9ENjbeoPaZdL6',
  })
  @IsString()
  @IsNotEmpty()
  paymentKey: string;

  @ApiProperty({
    description: '주문 ID',
    example: 'order_1234',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: '결제 금액',
    example: 50000,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: '고객 이메일',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @ApiProperty({
    description: '고객 이름',
    example: '홍길동',
  })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({
    description: '고객 전화번호',
    example: '01012345678',
  })
  @IsString()
  @IsNotEmpty()
  customerMobilePhone: string;
}
