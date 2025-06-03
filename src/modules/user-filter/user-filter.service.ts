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

  async getUserList(userId: string, cursorPaginationDto?: CursorPaginationDto) {
    this.logger.log(`사용자 목록을 조회합니다. userId: ${userId}`);
    const safeCursorDto: CursorPaginationDto = {
      cursor: cursorPaginationDto?.cursor ?? null,
      order: cursorPaginationDto?.order ?? ['likeCount_DESC'],
      take: cursorPaginationDto?.take ?? 6,
      seed: cursorPaginationDto?.seed,
    };
    const { users, nextCursor: newNextCursor } =
      await this.userService.getUserList(safeCursorDto, userId);

    this.logger.log(`조회된 사용자 수: ${users.length}`);
    return {
      users: this.mapUsersToResponse(users),
      nextCursor: newNextCursor,
    };
  }

  async getPublicUserList(cursorPaginationDto?: CursorPaginationDto) {
    this.logger.log(`비로그인 사용자 목록을 조회합니다.`);
    const safeCursorDto: CursorPaginationDto = {
      cursor: cursorPaginationDto?.cursor ?? null,
      order: cursorPaginationDto?.order ?? ['likeCount_DESC'],
      take: cursorPaginationDto?.take ?? 6,
      seed: cursorPaginationDto?.seed,
    };
    const { users, nextCursor: newNextCursor } =
      await this.userService.getUserList(safeCursorDto, undefined);

    this.logger.log(`조회된 사용자 수: ${users.length}`);
    return {
      users: this.mapUsersToResponse(users),
      nextCursor: newNextCursor,
    };
  }

  // 필터된 사용자 목록 조회
  async getFilteredUserList(
    userId: string,
    userFilterDto: UserFilterDto,
    cursorPaginationDto?: CursorPaginationDto,
  ) {
    this.logger.log(
      `필터된 사용자 목록을 조회합니다. userId: ${userId}, filter: ${JSON.stringify(userFilterDto)}`,
    );
    const safeCursorDto: CursorPaginationDto = {
      cursor: cursorPaginationDto?.cursor ?? null,
      order: cursorPaginationDto?.order ?? ['id_DESC'],
      take: cursorPaginationDto?.take ?? 10,
      seed: cursorPaginationDto?.seed,
    };
    const { users, nextCursor } = await this.userService.getFilteredUsers(
      userId,
      userFilterDto,
      safeCursorDto,
    );

    this.logger.log(`조회된 필터된 사용자 수: ${users.length}`);
    return {
      users: this.mapUsersToResponse(users),
      nextCursor,
    };
  }

  async getPublicFilteredUserList(
    userFilterDto: UserFilterDto,
    cursorPaginationDto?: CursorPaginationDto,
  ) {
    this.logger.log(
      `비로그인 필터된 사용자 목록을 조회합니다. filter: ${JSON.stringify(userFilterDto)}`,
    );
    const safeCursorDto: CursorPaginationDto = {
      cursor: cursorPaginationDto?.cursor ?? null,
      order: cursorPaginationDto?.order ?? ['id_DESC'],
      take: cursorPaginationDto?.take ?? 10,
      seed: cursorPaginationDto?.seed,
    };
    const { users, nextCursor } = await this.userService.getFilteredUsers(
      undefined,
      userFilterDto,
      safeCursorDto,
    );

    this.logger.log(`조회된 필터된 사용자 수: ${users.length}`);
    return {
      users: this.mapUsersToResponse(users),
      nextCursor,
    };
  }
}
