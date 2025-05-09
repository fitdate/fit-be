import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { Notification } from './types/notification.types';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('SSE')
@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @ApiOperation({ summary: 'SSE 연결' })
  @ApiResponse({ status: 200, description: 'SSE 연결 성공' })
  @Sse('connect/:userId')
  connect(@Param('userId') userId: string): Observable<MessageEvent> {
    return this.sseService.addClient(userId).asObservable();
  }

  @ApiOperation({ summary: 'SSE 연결 해제' })
  @ApiResponse({ status: 200, description: 'SSE 연결 해제 성공' })
  @Get('disconnect/:userId')
  disconnect(@Param('userId') userId: string) {
    this.sseService.removeClient(userId);
    return { message: 'Disconnected' };
  }

  @ApiOperation({ summary: '알림 전송' })
  @ApiResponse({ status: 200, description: '알림 전송 성공' })
  @Post('send/:userId')
  sendNotification(
    @Param('userId') userId: string,
    @Body() notification: Notification,
  ) {
    this.sseService.sendNotification(userId, notification);
    return { message: 'Notification sent' };
  }
}
