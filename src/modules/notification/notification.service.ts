import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private notificationSubject = new Subject<Notification>();

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  /**
   * 실시간 알림을 위한 SSE(Server-Sent Events) 스트림을 생성합니다.
   * 클라이언트는 이 스트림을 구독하여 새로운 알림을 실시간으로 받을 수 있습니다.
   */
  getNotificationStream(): Observable<Notification> {
    this.logger.log('알림 스트림 요청');
    return this.notificationSubject.asObservable();
  }

  /**
   * 새로운 알림을 생성하고 저장합니다.
   * 알림이 생성되면 실시간 스트림을 통해 구독자들에게 전달됩니다.
   * @param createNotificationDto 알림 생성에 필요한 데이터
   * @returns 생성된 알림 객체
   */
  async create(createNotificationDto: CreateNotificationDto) {
    this.logger.log(`새 알림 생성: ${JSON.stringify(createNotificationDto)}`);
    const notification = this.notificationRepository.create(
      createNotificationDto,
    );
    const savedNotification =
      await this.notificationRepository.save(notification);
    this.notificationSubject.next(savedNotification);
    this.logger.log(`알림 생성 완료: ID ${savedNotification.id}`);
    return savedNotification;
  }

  /**
   * 특정 사용자의 모든 알림을 조회합니다.
   * 알림은 생성일시 기준 내림차순으로 정렬됩니다.
   * @param userId 알림을 조회할 사용자의 ID
   * @returns 사용자의 알림 목록
   */
  async findAll(userId: string) {
    this.logger.log(`사용자 ${userId}의 알림 목록 조회`);
    return this.notificationRepository.find({
      where: { receiverId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * ID로 특정 알림을 조회합니다.
   * @param id 조회할 알림의 ID
   * @returns 조회된 알림 객체
   */
  async findOne(id: number) {
    this.logger.log(`알림 조회: ID ${id}`);
    return this.notificationRepository.findOne({ where: { id } });
  }

  /**
   * 특정 알림을 읽음 상태로 표시합니다.
   * @param id 읽음 처리할 알림의 ID
   * @returns 업데이트된 알림 객체 또는 null (알림을 찾을 수 없는 경우)
   */
  async markAsRead(id: number) {
    this.logger.log(`알림 읽음 처리: ID ${id}`);
    const notification = await this.findOne(id);
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
  async remove(id: number) {
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
