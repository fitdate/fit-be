import { Controller, Get, Body, Query } from '@nestjs/common';
import { UserFilterService } from './user-filter.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserFilterDto } from './dto/user-filter.dto';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';
import { UserId } from 'src/common/decorator/get-user.decorator';
@ApiTags('User Filter')
@Controller('user-filter')
export class UserFilterController {
  constructor(private readonly userFilterService: UserFilterService) {}

  @Get('list')
  @ApiOperation({
    summary: '회원목록 조회',
    description: '회원목록 조회',
  })
  async getUserList(@UserId() userId: string) {
    return this.userFilterService.getUserList(userId);
  }

  @Get('public-list')
  @ApiOperation({
    summary: '비로그인 회원목록 조회',
    description: '비로그인 회원목록 조회',
  })
  async getPublicUserList() {
    return this.userFilterService.getPublicUserList();
  }

  @Get('filtered-list')
  @ApiOperation({
    summary: '필터된 회원목록 조회',
    description: '필터된 회원목록 조회, 로그인 유저ID(없으면 비로그인)',
  })
  async getFilteredUserList(
    @Query() userFilterDto: UserFilterDto,
    @Query() cursorPaginationDto: CursorPaginationDto,
    @UserId() userId: string,
  ) {
    return this.userFilterService.getFilteredUserList(
      userId,
      userFilterDto,
      cursorPaginationDto,
    );
  }

  @Get('public-filtered-list')
  @ApiOperation({
    summary: '비로그인 필터된 회원목록 조회',
    description: '비로그인 필터된 회원목록 조회',
  })
  async getPublicFilteredUserList(
    @Query() userFilterDto: UserFilterDto,
    @Query() cursorPaginationDto: CursorPaginationDto,
  ) {
    return this.userFilterService.getPublicFilteredUserList(
      userFilterDto,
      cursorPaginationDto,
    );
  }
}
