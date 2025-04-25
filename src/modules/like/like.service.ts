import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from './entities/like.entity';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enum/notification.enum';

@Injectable()
export class LikeService {
  private readonly logger = new Logger(LikeService.name);

  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  async toggleLike(
    userId: string,
    likedUserId: string,
  ): Promise<{ isLiked: boolean }> {
    this.logger.log(
      `좋아요 토글 시작: userId=${userId}, likedUserId=${likedUserId}`,
    );

    return await this.likeRepository.manager.transaction(
      'SERIALIZABLE',
      async (manager) => {
        this.logger.log('트랜잭션 시작');

        const user = await manager.findOne(User, { where: { id: userId } });
        const likedUser = await manager.findOne(User, {
          where: { id: likedUserId },
        });

        if (!user || !likedUser) {
          this.logger.error(
            `사용자를 찾을 수 없음: userId=${userId}, likedUserId=${likedUserId}`,
          );
          throw new Error('사용자를 찾을 수 없습니다.');
        }

        this.logger.log(
          `사용자 확인 완료: user=${user.id}, likedUser=${likedUser.id}`,
        );

        // 이미 좋아요를 눌렀는지 확인
        const existingLike = await manager.findOne(Like, {
          where: {
            user: { id: userId },
            likedUser: { id: likedUserId },
          },
        });

        if (existingLike) {
          this.logger.log(`기존 좋아요 발견: likeId=${existingLike.id}`);
          // 좋아요 취소
          await manager.remove(existingLike);
          await manager.decrement(User, { id: likedUserId }, 'likeCount', 1);
          this.logger.log(`좋아요 취소 완료: likedUserId=${likedUserId}`);
          return { isLiked: false };
        } else {
          this.logger.log('새로운 좋아요 생성 시작');
          // 좋아요 추가
          const like = manager.create(Like, {
            user,
            likedUser,
            isNotified: false,
          });
          await manager.save(like);
          await manager.increment(User, { id: likedUserId }, 'likeCount', 1);
          this.logger.log(`좋아요 추가 완료: likeId=${like.id}`);

          try {
            this.logger.log('알림 생성 시도');
            // 알림 생성
            await this.notificationService.create({
              type: NotificationType.LIKE,
              receiverId: likedUserId,
              data: {
                senderId: userId,
              },
            });

            // 알림 전송 완료 표시
            like.isNotified = true;
            await manager.save(like);
            this.logger.log('알림 생성 및 저장 완료');
          } catch (error) {
            this.logger.error(`알림 생성 실패: ${(error as Error).message}`);
            this.logger.error(`알림 생성 실패 상세: ${JSON.stringify(error)}`);
          }

          return { isLiked: true };
        }
      },
    );
  }

  async checkLikeStatus(userId: string, likedUserId: string): Promise<boolean> {
    const like = await this.likeRepository.findOne({
      where: {
        user: { id: userId },
        likedUser: { id: likedUserId },
      },
    });
    return !!like;
  }

  async getLikeList(userId: string) {
    const likeList = await this.likeRepository
      .createQueryBuilder('like')
      .leftJoinAndSelect('like.likedUser', 'likedUser')
      .leftJoinAndSelect('likedUser.profile', 'likedUserProfile')
      .leftJoinAndSelect(
        'likedUserProfile.profileImage',
        'likedUserProfileImage',
      )
      .where('like.user_id = :userId', { userId })
      .getMany();
    return likeList;
  }
}
