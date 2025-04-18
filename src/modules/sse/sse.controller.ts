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
import { NotificationDto } from './types/notification.types';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('connect/:userId')
  connect(@Param('userId') userId: string): Observable<MessageEvent> {
    return this.sseService.addClient(userId).asObservable();
  }

  @Get('disconnect/:userId')
  disconnect(@Param('userId') userId: string) {
    this.sseService.removeClient(userId);
    return { message: 'Disconnected' };
  }

  @Post('send/:userId')
  sendNotification(
    @Param('userId') userId: string,
    @Body() notification: NotificationDto,
  ) {
    this.sseService.sendNotification(userId, notification);
    return { message: 'Notification sent' };
  }
}
