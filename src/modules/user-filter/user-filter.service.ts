import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { calculateAge } from 'src/common/util/age-calculator.util';
import { UserFilterDto } from './dto/user-filter.dto';
import { User as UserEntity } from '../user/entities/user.entity';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';
@Injectable()
export class UserFilterService {
  private readonly logger = new Logger(UserFilterService.name);

  constructor(private readonly userService: UserService) {}

  private mapUsersToResponse(users: UserEntity[]) {
    return users.map((user) => ({
      id: user.id,
      nickname: user.nickname,
      region: user.region,
      likeCount: user.likeCount,
      age: calculateAge(user.birthday),
      profileImage: user.profile?.profileImage?.[0]?.imageUrl ?? null,
    }));
  }

  // 회원목록 조회 (로그인/비로그인인 통합)
  async getUserList(userId?: string) {
    this.logger.debug(`사용자 목록을 조회합니다.`);
    const { users, nextCursor } = await this.userService.getUserList(
      {
        cursor: null,
        order: ['likeCount_DESC'],
        take: 6,
      },
      userId,
    );

    return {
      users: this.mapUsersToResponse(users),
      nextCursor,
    };
  }

  // 필터된 사용자 목록 조회
  async getFilteredUserList(
    userFilterDto: UserFilterDto,
    cursorPaginationDto: CursorPaginationDto,
    userId?: string,
  ) {
    const { users, nextCursor } = await this.userService.getFilteredUsers(
      userId,
      userFilterDto,
      cursorPaginationDto,
    );

    return {
      users: this.mapUsersToResponse(users),
      nextCursor,
    };
  }
}
