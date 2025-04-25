import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private isDestroyed = false;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  /**
   * 서비스 종료 시 정리 작업을 수행합니다.
   */
  onModuleDestroy() {
    this.logger.log('알림 서비스 정리 작업 시작');
    this.isDestroyed = true;
    this.logger.log('알림 서비스 정리 작업 완료');
  }

  /**
   * 새로운 알림을 생성하고 저장합니다.
   * @param createNotificationDto 알림 생성에 필요한 데이터
   * @returns 생성된 알림 객체
   */
  async create(createNotificationDto: CreateNotificationDto) {
    try {
      this.logger.log(
        `새 알림 생성 시도: ${JSON.stringify(createNotificationDto)}`,
      );

      if (!createNotificationDto.receiverId) {
        this.logger.error('수신자 ID가 없습니다.');
        throw new InternalServerErrorException('수신자 ID가 필요합니다.');
      }

      if (!createNotificationDto.title) {
        this.logger.error('알림 제목이 없습니다.');
        throw new InternalServerErrorException('알림 제목이 필요합니다.');
      }

      if (!createNotificationDto.content) {
        this.logger.error('알림 내용이 없습니다.');
        throw new InternalServerErrorException('알림 내용이 필요합니다.');
      }

      const notification = this.notificationRepository.create({
        ...createNotificationDto,
        receiverId: createNotificationDto.receiverId,
      });

      // 타임아웃 설정
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('알림 생성 시간 초과'));
        }, 10000); // 10초 타임아웃
      });

      const savedNotification = await Promise.race<Notification>([
        this.notificationRepository.save(notification),
        timeoutPromise,
      ]);

      this.logger.log(`알림 저장 성공: ID ${savedNotification.id}`);

      return savedNotification;
    } catch (error) {
      this.logger.error(`알림 생성 실패: ${(error as Error).message}`);
      throw new InternalServerErrorException(
        '알림 생성 중 오류가 발생했습니다.',
      );
    }
  }

  /**
   * 특정 사용자의 모든 알림을 조회합니다.
   * 알림은 생성일시 기준 내림차순으로 정렬됩니다.
   * @param userId 알림을 조회할 사용자의 ID
   * @returns 사용자의 알림 목록
   */
  async findAll(userId: string): Promise<NotificationResponseDto[]> {
    try {
      this.logger.log(`사용자 ${userId}의 알림 목록 조회 시작`);

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

      this.logger.log(
        `사용자 ${userId}의 알림 ${notifications.length}개 조회 완료`,
      );

      notifications.forEach((notification) => {
        this.logger.debug(
          `알림 상세: ID=${notification.id}, 제목=${notification.title}, 타입=${notification.type}, 읽음=${notification.isRead}`,
        );
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
    } catch (error) {
      this.logger.error(`알림 조회 실패: ${(error as Error).message}`);
      throw new InternalServerErrorException(
        '알림 조회 중 오류가 발생했습니다.',
      );
    }
  }

  /**
   * 특정 알림을 읽음 상태로 표시합니다.
   * @param id 읽음 처리할 알림의 ID
   * @returns 업데이트된 알림 객체 또는 null (알림을 찾을 수 없는 경우)
   */
  async markAsRead(id: string) {
    this.logger.log(`알림 읽음 처리: ID ${id}`);
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });
    if (notification) {
      notification.isRead = true;
      return this.notificationRepository.save(notification);
    }
    this.logger.warn(`알림을 찾을 수 없음: ID ${id}`);
    return null;
  }

  /**
   * 특정 알림을 삭제합니다.
   * @param id 삭제할 알림의 ID
   * @returns 삭제 작업 결과
   */
  async remove(id: string) {
    this.logger.log(`알림 삭제: ID ${id}`);
    return this.notificationRepository.delete(id);
  }

  /**
   * 특정 사용자의 모든 알림을 삭제합니다.
   * @param userId 알림을 삭제할 사용자의 ID
   * @returns 삭제 작업 결과
   */
  async removeAll(userId: string) {
    this.logger.log(`사용자 ${userId}의 모든 알림 삭제`);
    return this.notificationRepository.delete({ receiverId: userId });
  }
}
