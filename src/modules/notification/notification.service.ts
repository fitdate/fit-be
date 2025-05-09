import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { Observable, Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private notificationStreams: Map<string, Subject<Notification>> = new Map();
  private readonly STREAM_TIMEOUT = 5 * 60 * 1000; // 5분으로 변경
  private readonly CLEANUP_INTERVAL = 1 * 60 * 1000; // 1분으로 변경

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {
    // 주기적으로 사용하지 않는 스트림 정리
    this.startStreamCleanup();
  }

  private startStreamCleanup(): void {
    timer(this.CLEANUP_INTERVAL, this.CLEANUP_INTERVAL).subscribe(() => {
      this.cleanupInactiveStreams();
    });
  }

  private cleanupInactiveStreams(): void {
    for (const [userId, stream] of this.notificationStreams.entries()) {
      if (stream.closed) {
        this.notificationStreams.delete(userId);
        this.logger.debug(`사용자 ${userId}의 비활성 스트림이 정리되었습니다.`);
      }
    }
  }

  // SSE 스트림 생성
  createNotificationStream(userId: string): Observable<Notification> {
    this.logger.debug(`[SSE] 사용자 ${userId}의 스트림 생성 요청`);

    let stream = this.notificationStreams.get(userId);
    if (!stream) {
      this.logger.debug(`[SSE] 사용자 ${userId}의 새로운 스트림 생성 시작`);
      stream = new Subject<Notification>();
      this.notificationStreams.set(userId, stream);
      this.logger.debug(
        `[SSE] 현재 활성 스트림 수: ${this.notificationStreams.size}`,
      );

      // 스트림 타임아웃 설정
      timer(this.STREAM_TIMEOUT)
        .pipe(takeUntil(stream))
        .subscribe(() => {
          if (this.notificationStreams.has(userId)) {
            const currentStream = this.notificationStreams.get(userId);
            if (currentStream && !currentStream.closed) {
              this.logger.debug(
                `[SSE] 사용자 ${userId}의 스트림 타임아웃 발생`,
              );
              currentStream.complete();
              this.notificationStreams.delete(userId);
              this.logger.debug(
                `[SSE] 타임아웃 후 활성 스트림 수: ${this.notificationStreams.size}`,
              );
            }
          }
        });

      // 에러 처리
      stream.subscribe({
        next: (notification) => {
          this.logger.debug(
            `[SSE] 사용자 ${userId}에게 알림 전송: ${JSON.stringify(notification)}`,
          );
        },
        error: (error: Error) => {
          this.logger.error(
            `[SSE] 스트림 에러 발생 - 사용자: ${userId}, 에러: ${error.message}`,
          );
          if (this.notificationStreams.has(userId)) {
            this.notificationStreams.delete(userId);
            this.logger.debug(
              `[SSE] 에러 후 활성 스트림 수: ${this.notificationStreams.size}`,
            );
          }
        },
        complete: () => {
          this.logger.debug(`[SSE] 사용자 ${userId}의 스트림 완료`);
          if (this.notificationStreams.has(userId)) {
            this.notificationStreams.delete(userId);
            this.logger.debug(
              `[SSE] 완료 후 활성 스트림 수: ${this.notificationStreams.size}`,
            );
          }
        },
      });
    } else {
      this.logger.debug(`[SSE] 사용자 ${userId}의 기존 스트림 재사용`);
    }
    return stream.asObservable();
  }

  // 알림 생성
  async create(createNotificationDto: CreateNotificationDto) {
    try {
      this.logger.debug(
        `[알림 생성] 요청 데이터: ${JSON.stringify(createNotificationDto)}`,
      );

      if (!createNotificationDto.receiverId) {
        this.logger.error('[알림 생성] 수신자 ID 누락');
        throw new InternalServerErrorException('수신자 ID가 필요합니다.');
      }

      if (!createNotificationDto.title) {
        this.logger.error('[알림 생성] 제목 누락');
        throw new InternalServerErrorException('알림 제목이 필요합니다.');
      }

      if (!createNotificationDto.content) {
        this.logger.error('[알림 생성] 내용 누락');
        throw new InternalServerErrorException('알림 내용이 필요합니다.');
      }

      const notification = this.notificationRepository.create({
        ...createNotificationDto,
        receiverId: createNotificationDto.receiverId,
      });

      this.logger.debug(
        `[알림 생성] DB 저장 시작: ${JSON.stringify(notification)}`,
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          this.logger.error('[알림 생성] DB 저장 시간 초과');
          reject(new Error('알림 생성 시간 초과'));
        }, 10000);
      });

      const savedNotification = await Promise.race<Notification>([
        this.notificationRepository.save(notification),
        timeoutPromise,
      ]);

      this.logger.debug(
        `[알림 생성] DB 저장 완료: ${JSON.stringify(savedNotification)}`,
      );

      // SSE 스트림으로 알림 전송
      const stream = this.notificationStreams.get(
        createNotificationDto.receiverId,
      );
      if (stream) {
        try {
          this.logger.debug(
            `[알림 전송] 스트림으로 전송 시작: ${createNotificationDto.receiverId}`,
          );
          stream.next(savedNotification);
          this.logger.debug(
            `[알림 전송] 스트림으로 전송 완료: ${createNotificationDto.receiverId}`,
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : '알 수 없는 오류';
          this.logger.error(`[알림 전송] 스트림 전송 실패: ${errorMessage}`);
          if (stream.closed) {
            this.notificationStreams.delete(createNotificationDto.receiverId);
            this.logger.debug(
              `[알림 전송] 닫힌 스트림 정리 완료: ${createNotificationDto.receiverId}`,
            );
          }
        }
      } else {
        this.logger.debug(
          `[알림 전송] 수신자 ${createNotificationDto.receiverId}의 활성 스트림 없음`,
        );
      }

      return savedNotification;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.error(`[알림 생성] 오류 발생: ${errorMessage}`);
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.error(`알림 조회 중 오류 발생: ${errorMessage}`);
      throw new InternalServerErrorException(
        '알림 조회 중 오류가 발생했습니다.',
      );
    }
  }

  // 알림 읽음 처리
  async markAsRead(id: string) {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id },
      });
      if (notification) {
        notification.isRead = true;
        return this.notificationRepository.save(notification);
      }
      return null;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.error(`알림 읽음 처리 중 오류 발생: ${errorMessage}`);
      throw new InternalServerErrorException(
        '알림 읽음 처리 중 오류가 발생했습니다.',
      );
    }
  }

  // 알림 삭제
  async remove(id: string) {
    try {
      return await this.notificationRepository.delete(id);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.error(`알림 삭제 중 오류 발생: ${errorMessage}`);
      throw new InternalServerErrorException(
        '알림 삭제 중 오류가 발생했습니다.',
      );
    }
  }

  // 전체 알림 삭제
  async removeAll(userId: string) {
    try {
      return await this.notificationRepository.delete({ receiverId: userId });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.error(`전체 알림 삭제 중 오류 발생: ${errorMessage}`);
      throw new InternalServerErrorException(
        '전체 알림 삭제 중 오류가 발생했습니다.',
      );
    }
  }
}
