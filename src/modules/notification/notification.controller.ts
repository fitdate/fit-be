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
  ApiBody,
} from '@nestjs/swagger';
import { Notification } from './entities/notification.entity';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notification')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: '알림 생성' })
  @ApiResponse({
    status: 201,
    description: '알림이 생성되었습니다.',
    type: Notification,
  })
  @ApiBody({
    type: CreateNotificationDto,
    examples: {
      match: {
        summary: '매칭 알림',
        value: {
          type: 'MATCH',
          receiverId: 'ad6aba82-e59b-4bc2-8f2f-1c47d818e930',
          title: '새로운 매칭',
          content: '새로운 매칭이 생성되었습니다.',
        },
      },
      like: {
        summary: '좋아요 알림',
        value: {
          type: 'LIKE',
          receiverId: 'ad6aba82-e59b-4bc2-8f2f-1c47d818e930',
          title: '새로운 좋아요',
          content: '누군가가 당신의 프로필을 좋아합니다.',
        },
      },
      coffeeChat: {
        summary: '커피챗 알림',
        value: {
          type: 'COFFEE_CHAT',
          receiverId: 'ad6aba82-e59b-4bc2-8f2f-1c47d818e930',
          title: '커피챗 요청',
          content: '새로운 커피챗 요청이 있습니다.',
          data: {
            chatId: 123,
            senderId: 456,
          },
        },
      },
      chat: {
        summary: '채팅 알림',
        value: {
          type: 'CHAT',
          receiverId: 'ad6aba82-e59b-4bc2-8f2f-1c47d818e930',
          title: '대화방 입장',
          content: '상대방이 대화방에 입장했습니다.',
          data: {
            chatRoomId: 789,
            messageId: 123,
          },
        },
      },
    },
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
