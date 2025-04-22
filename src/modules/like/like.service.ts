import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from './entities/like.entity';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/create-notification.dto';

@Injectable()
export class LikeService {
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
    return await this.likeRepository.manager.transaction(
      'SERIALIZABLE',
      async (manager) => {
        const user = await manager.findOne(User, { where: { id: userId } });
        const likedUser = await manager.findOne(User, {
          where: { id: likedUserId },
        });

        if (!user || !likedUser) {
          throw new Error('사용자를 찾을 수 없습니다.');
        }

        // 이미 좋아요를 눌렀는지 확인
        const existingLike = await manager.findOne(Like, {
          where: {
            user: { id: userId },
            likedUser: { id: likedUserId },
          },
        });

        if (existingLike) {
          // 좋아요 취소
          await manager.remove(existingLike);
          await manager.decrement(User, { id: likedUserId }, 'likeCount', 1);
          return { isLiked: false };
        } else {
          // 좋아요 추가
          const like = manager.create(Like, {
            user,
            likedUser,
            isNotified: false,
          });
          await manager.save(like);
          await manager.increment(User, { id: likedUserId }, 'likeCount', 1);

          // 알림 생성
          await this.notificationService.create({
            type: NotificationType.LIKE,
            receiverId: Number(likedUserId),
            data: {
              senderId: userId,
            },
          });

          // 알림 전송 완료 표시
          like.isNotified = true;
          await manager.save(like);

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
}
