import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SseService } from '../sse/sse.service';
import { NotificationType } from '../sse/types/notification.types';
import {
  DAILY_COFFEE_CHAT_AM_10,
  DAILY_PRE_COFFEE_CHAT_AM_9_55,
} from './const/task-time';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private readonly sseService: SseService) {}

  // 매일 오전 10시에 실행
  @Cron(DAILY_COFFEE_CHAT_AM_10)
  handleDailyTask() {
    this.logger.log('매일 오전 10시 커피챗 알림 보내기');

    // todo: 커피챗 서비스 사용하기
    // 사용자들에게 커피챗 알림 보내기기
    this.sseService.sendNotification('실제 유저 넣기', {
      message: '커피챗이 시작되었습니다!',
      timestamp: new Date(),
      type: NotificationType.SYSTEM,
    });
  }

  // 매일 오전 9시 55분에 실행
  @Cron(DAILY_PRE_COFFEE_CHAT_AM_9_55)
  handlePreCoffeeChatTask() {
    this.logger.log('매일 오전 9시 55분 커피챗 알림 보내기');
    // todo: 커피챗 서비스 사용하기
    // 사용자들에게 커피챗 시작 전 5분 알림 보내기
    this.sseService.sendNotification('실제 유저 넣기', {
      message: '커피챗 시작 전 5분입니다!',
      timestamp: new Date(),
      type: NotificationType.SYSTEM,
    });
  }
}
