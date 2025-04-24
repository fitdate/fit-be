import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  OnModuleDestroy,
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

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController implements OnModuleDestroy {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: '알림 생성' })
  @ApiResponse({
    status: 201,
    description: '알림이 생성되었습니다.',
    type: Notification,
  })
  @ApiBody({
    type: CreateNotificationDto,
    description:
      '알림 생성에 필요한 데이터 (알림 생성은 다른 모듈에서 이루어집니다.)',
  })
  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @ApiOperation({ summary: '알림 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '알림 목록을 반환합니다.',
    type: [NotificationResponseDto],
  })
  @Get()
  async findAll(@Req() req: RequestWithUser) {
    return this.notificationService.findAll(req.user.id.toString());
  }

  @ApiOperation({ summary: '알림 읽음 표시' })
  @ApiResponse({
    status: 200,
    description: '알림이 읽음 처리되었습니다.',
    type: NotificationResponseDto,
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
  async removeAll(@Req() req: RequestWithUser) {
    return this.notificationService.removeAll(req.user.id.toString());
  }

  onModuleDestroy() {
    this.notificationService.onModuleDestroy();
  }
}
