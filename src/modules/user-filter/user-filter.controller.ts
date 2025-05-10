import { Controller, Get, Body, Query } from '@nestjs/common';
import { UserFilterService } from './user-filter.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserFilterDto } from './dto/user-filter.dto';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';
import { Public } from 'src/common/decorator/public.decorator';
import { UserId } from 'src/common/decorator/get-user.decorator';
@ApiTags('User Filter')
@Controller('user-filter')
export class UserFilterController {
  constructor(private readonly userFilterService: UserFilterService) {}

  @Public()
  @Get('list')
  @ApiOperation({
    summary: '회원목록 조회',
    description: '회원목록 조회',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: '로그인 유저 ID(없으면 비로그인)',
  })
  async getUserList(@UserId() userId?: string) {
    return this.userFilterService.getUserList(userId);
  }

  @Public()
  @Get('filtered-list')
  @ApiOperation({
    summary: '필터된 회원목록 조회',
    description: '필터된 회원목록 조회, 로그인 유저ID(없으면 비로그인)',
  })
  async getFilteredUserList(
    @Query() userFilterDto: UserFilterDto,
    @Query() cursorPaginationDto: CursorPaginationDto,
    @UserId() userId?: string,
  ) {
    return this.userFilterService.getFilteredUserList(
      userFilterDto,
      cursorPaginationDto,
      userId,
    );
  }
}
