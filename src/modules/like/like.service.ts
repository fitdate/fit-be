import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from './entities/like.entity';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enum/notification.enum';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  // 사용자 좋아요 토글 처리
  async toggleLike(
    userId: string,
    likedUserId: string,
  ): Promise<{ isLiked: boolean }> {
    const [user, likedUser] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId } }),
      this.userRepository.findOne({ where: { id: likedUserId } }),
    ]);

    if (!user || !likedUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const existingLike = await this.likeRepository.findOne({
      where: {
        user: { id: userId },
        likedUser: { id: likedUserId },
      },
    });

    if (existingLike) {
      await this.likeRepository.remove(existingLike);
      await this.userRepository.decrement({ id: likedUserId }, 'likeCount', 1);
      return { isLiked: false };
    }

    const like = this.likeRepository.create({
      user,
      likedUser,
      isNotified: false,
    });
    await this.likeRepository.save(like);
    await this.userRepository.increment({ id: likedUserId }, 'likeCount', 1);

    this.createNotification(user, likedUser, like).catch((error) => {
      console.error('알림 생성 실패:', error);
    });

    return { isLiked: true };
  }

  // 좋아요 알림 생성
  private async createNotification(
    user: User,
    likedUser: User,
    like: Like,
  ): Promise<void> {
    try {
      await this.notificationService.create({
        type: NotificationType.LIKE,
        receiverId: likedUser.id,
        title: '새로운 좋아요',
        content: `${user.nickname}님이 회원님을 좋아합니다.`,
        data: {
          senderId: user.id,
          senderNickname: user.nickname,
        },
      });

      like.isNotified = true;
      await this.likeRepository.save(like);
    } catch (error) {
      console.error('알림 생성 실패:', error);
    }
  }

  // 좋아요 상태 확인
  async checkLikeStatus(userId: string, likedUserId: string): Promise<boolean> {
    const like = await this.likeRepository.findOne({
      where: {
        user: { id: userId },
        likedUser: { id: likedUserId },
      },
    });
    return !!like;
  }

  // 좋아요 목록 조회
  async getLikeList(userId: string) {
    return await this.likeRepository
      .createQueryBuilder('like')
      .leftJoinAndSelect('like.user', 'user')
      .leftJoinAndSelect('user.profile', 'userProfile')
      .leftJoinAndSelect('userProfile.profileImage', 'userProfileImage')
      .where('like.liked_user_id = :userId', { userId })
      .getMany();
  }
}
