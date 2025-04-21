import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Sse,
  MessageEvent,
  Req,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { JwtAuthGuard } from '../auth/strategy/jwt.strategy';
import { RequestWithUser } from './types/notification.types';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Notification } from './entities/notification.entity';

@ApiTags('알림')
@ApiBearerAuth()
@Controller('Notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: '알림 생성' })
  @ApiResponse({
    status: 201,
    description: '알림이 생성되었습니다.',
    type: Notification,
  })
  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @ApiOperation({ summary: '알림 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '알림 목록을 반환합니다.',
    type: [Notification],
  })
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.notificationService.findAll(req.user.id);
  }

  @ApiOperation({ summary: '알림 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '알림을 반환합니다.',
    type: Notification,
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationService.findOne(+id);
  }

  @ApiOperation({ summary: '알림 읽음 표시' })
  @ApiResponse({
    status: 200,
    description: '알림이 읽음 처리되었습니다.',
    type: Notification,
  })
  @Post(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(+id);
  }

  @ApiOperation({ summary: '알림 삭제' })
  @ApiResponse({ status: 200, description: '알림이 삭제되었습니다.' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationService.remove(+id);
  }

  @ApiOperation({ summary: '전체 알림 삭제' })
  @ApiResponse({ status: 200, description: '모든 알림이 삭제되었습니다.' })
  @Delete()
  removeAll(@Req() req: RequestWithUser) {
    return this.notificationService.removeAll(req.user.id);
  }

  @ApiOperation({ summary: '실시간 알림 스트림' })
  @ApiResponse({
    status: 200,
    description: 'SSE 연결이 성공적으로 설정되었습니다.',
  })
  @Sse('events')
  streamNotifications(@Req() req: RequestWithUser): Observable<MessageEvent> {
    return this.notificationService.getNotificationStream().pipe(
      filter((notification) => notification.receiverId === req.user.id),
      map((notification) => ({
        data: JSON.stringify(notification),
      })),
    );
  }
}
