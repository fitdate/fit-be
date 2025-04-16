import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { TossPaymentResponse } from './types/toss-payment.types';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { Payment } from './entities/payment.entity';

@ApiTags('결제')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({
    summary: '결제 확인',
    description: '토스페이먼츠 결제를 확인합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '결제 확인 성공',
    type: TossPaymentResponse,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 500, description: '서버 에러' })
  @Post('confirm')
  // 토스페이먼츠 결제 확인 처리
  async confirmPayment(
    @Query() confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<{ data: TossPaymentResponse }> {
    return this.paymentService.confirmPayment(
      confirmPaymentDto.paymentKey,
      confirmPaymentDto.orderId,
      confirmPaymentDto.amount,
    );
  }

  @ApiOperation({
    summary: '결제 조회',
    description: '주문 ID로 결제 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '결제 정보 조회 성공',
    type: Payment,
  })
  @ApiResponse({ status: 404, description: '결제 정보를 찾을 수 없음' })
  @Get(':orderId')
  // 주문 ID로 결제 정보 조회
  async getPayment(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentByOrderId(orderId);
  }
}
