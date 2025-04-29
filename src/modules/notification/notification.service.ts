import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  // 알림 생성
  async create(createNotificationDto: CreateNotificationDto) {
    try {
      if (!createNotificationDto.receiverId) {
        throw new InternalServerErrorException('수신자 ID가 필요합니다.');
      }

      if (!createNotificationDto.title) {
        throw new InternalServerErrorException('알림 제목이 필요합니다.');
      }

      if (!createNotificationDto.content) {
        throw new InternalServerErrorException('알림 내용이 필요합니다.');
      }

      const notification = this.notificationRepository.create({
        ...createNotificationDto,
        receiverId: createNotificationDto.receiverId,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('알림 생성 시간 초과'));
        }, 10000);
      });

      const savedNotification = await Promise.race<Notification>([
        this.notificationRepository.save(notification),
        timeoutPromise,
      ]);

      return savedNotification;
    } catch {
      throw new InternalServerErrorException(
        '알림 생성 중 오류가 발생했습니다.',
      );
    }
  }

  // 알림 목록 조회
  async findAll(userId: string): Promise<NotificationResponseDto[]> {
    try {
      const notifications = await this.notificationRepository.find({
        where: { receiverId: userId },
        order: { createdAt: 'DESC' },
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          isRead: true,
          createdAt: true,
          data: true,
        },
      });

      return notifications.map((notification) => ({
        id: notification?.id?.toString() ?? '',
        title: notification?.title ?? '',
        content: notification?.content ?? '',
        type: notification?.type ?? '',
        isRead: notification?.isRead ?? false,
        createdAt:
          notification?.createdAt?.toISOString() ?? new Date().toISOString(),
        data: notification?.data ?? {},
      }));
    } catch {
      throw new InternalServerErrorException(
        '알림 조회 중 오류가 발생했습니다.',
      );
    }
  }

  // 알림 읽음 처리
  async markAsRead(id: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });
    if (notification) {
      notification.isRead = true;
      return this.notificationRepository.save(notification);
    }
    return null;
  }

  // 알림 삭제
  async remove(id: string) {
    return this.notificationRepository.delete(id);
  }

  // 전체 알림 삭제
  async removeAll(userId: string) {
    return this.notificationRepository.delete({ receiverId: userId });
  }
}
