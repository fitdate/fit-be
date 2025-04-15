import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from './entities/like.entity';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';

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
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const likedUser = await this.userRepository.findOne({
      where: { id: likedUserId },
    });

    if (!user || !likedUser) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 이미 좋아요를 눌렀는지 확인
    const existingLike = await this.likeRepository.findOne({
      where: {
        user: { id: userId },
        likedUser: { id: likedUserId },
      },
    });

    if (existingLike) {
      // 좋아요 취소 - 알림 없음
      await this.likeRepository.remove(existingLike);
      likedUser.likeCount = (likedUser.likeCount || 1) - 1;
      await this.userRepository.save(likedUser);
      return { isLiked: false };
    } else {
      // 좋아요 추가 - 알림 전송
      const like = this.likeRepository.create({
        user,
        likedUser,
        isNotified: false,
      });
      await this.likeRepository.save(like);
      likedUser.likeCount = (likedUser.likeCount || 0) + 1;
      await this.userRepository.save(likedUser);

      // 알림 전송
      this.notificationService.create({
        userId: likedUserId,
        type: 'LIKE',
        message: `${user.nickname}님이 좋아요를 눌렀습니다.`,
        data: { likeId: like.id },
      });

      // 알림 전송 완료 표시
      like.isNotified = true;
      await this.likeRepository.save(like);

      return { isLiked: true };
    }
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
