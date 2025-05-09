import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { RequestWithUser } from './types/notification.types';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Notification } from './entities/notification.entity';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Logger } from '@nestjs/common';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  // SSE 엔드포인트
  @Sse('stream/:userId')
  streamNotifications(
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ): Observable<MessageEvent> {
    this.logger.debug(`[SSE] 스트림 연결 요청 - 사용자: ${userId}`);

    const tokenUserId = req.user?.sub || req.user?.id;
    if (!tokenUserId || tokenUserId !== userId) {
      this.logger.warn(
        `[SSE] 인증 실패 - 요청 userId: ${userId}, 토큰 userId: ${tokenUserId}`,
      );
      return new Observable<MessageEvent>((subscriber) => {
        subscriber.complete();
      });
    }

    this.logger.debug(`[SSE] 스트림 연결 성공 - 사용자: ${userId}`);
    return this.notificationService.createNotificationStream(userId).pipe(
      map((notification) => ({
        data: notification,
        type: 'message',
        id: notification.id,
      })),
    );
  }

  // 알림 생성
  @ApiOperation({
    summary: '알림 생성',
    description:
      '이 API는 내부용으로, 다른 모듈(채팅, 매칭 등)에서 알림을 생성할 때 사용됩니다. 직접 호출하지 마세요.',
  })
  @ApiResponse({
    status: 201,
    description: '알림이 생성되었습니다.',
    type: Notification,
  })
  @ApiBody({ required: false })
  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  // 알림 목록 조회
  @ApiOperation({ summary: '알림 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '알림 목록을 반환합니다.',
    type: [NotificationResponseDto],
  })
  @Get()
  async findAll(@Req() req: RequestWithUser) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }
    return this.notificationService.findAll(userId.toString());
  }

  // 알림 읽음 처리
  @ApiOperation({ summary: '알림 읽음 표시' })
  @ApiResponse({
    status: 200,
    description: '알림이 읽음 처리되었습니다.',
    type: NotificationResponseDto,
  })
  @Post(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  // 알림 삭제
  @ApiOperation({ summary: '알림 삭제' })
  @ApiResponse({ status: 200, description: '알림이 삭제되었습니다.' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }

  // 전체 알림 삭제
  @ApiOperation({ summary: '전체 알림 삭제' })
  @ApiResponse({ status: 200, description: '모든 알림이 삭제되었습니다.' })
  @Delete()
  async removeAll(@Req() req: RequestWithUser) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }
    return this.notificationService.removeAll(userId.toString());
  }
}
