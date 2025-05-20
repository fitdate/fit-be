import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';
import { CreateNotificationDto } from '../notification/dto/create-notification.dto';
import { DAILY_PRE_COFFEE_CHAT_AM_9_55 } from './const/task-time';
import { NotificationType } from '../../common/enum/notification.enum';
import { UserService } from '../user/user.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  // 매일 오전 10시에 실행
  // @Cron(DAILY_COFFEE_CHAT_AM_10)
  // 테스트 5분 간격
  @Cron('*/5 * * * *')
  async handleWorldCupTask() {
    this.logger.log('매일 오전 10시 커피챗 알림 보내기');
    const users = await this.userService.findAllUsers();
    for (const userId of users) {
      const notificationDto: CreateNotificationDto = {
        receiverId: userId,
        title: '커피챗 알림',
        content: '커피챗이 시작되었습니다!',
        type: NotificationType.WORLD_CUP,
        data: { timestamp: new Date() },
      };
      await this.notificationService.create(notificationDto);
    }
  }

  // 매일 오전 9시 55분에 실행
  @Cron(DAILY_PRE_COFFEE_CHAT_AM_9_55)
  async handlePreWorldCupTask() {
    this.logger.log('매일 오전 9시 55분 커피챗 알림 보내기');
    const users = await this.userService.findAllUsers();
    for (const userId of users) {
      const notificationDto: CreateNotificationDto = {
        receiverId: userId,
        title: '커피챗 알림',
        content: '커피챗 시작 5분 전입니다!',
        type: NotificationType.WORLD_CUP,
        data: { timestamp: new Date() },
      };
      await this.notificationService.create(notificationDto);
    }
  }

  async worldCupTest() {
    this.logger.log('매일 오전 10시 커피챗 알림 보내기');
    const users = await this.userService.findAllUsers();
    for (const userId of users) {
      const notificationDto: CreateNotificationDto = {
        receiverId: userId,
        title: '커피챗 알림 테스트',
        content: '커피챗이 시작되었습니다!',
        type: NotificationType.WORLD_CUP,
        data: { timestamp: new Date() },
      };
      await this.notificationService.create(notificationDto);
    }
  }
}
