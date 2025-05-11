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

  @Get('list')
  @ApiOperation({
    summary: '회원목록 조회',
    description: '회원목록 조회',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: '커서 값',
  })
  async getUserList(
    @UserId() userId: string,
    @Query() cursorPaginationDto: CursorPaginationDto,
  ) {
    return this.userFilterService.getUserList(userId, cursorPaginationDto);
  }

  @Public()
  @Get('public-list')
  @ApiOperation({
    summary: '비로그인 회원목록 조회',
    description: '비로그인 회원목록 조회',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: '커서 값',
  })
  async getPublicUserList(@Query() cursorPaginationDto: CursorPaginationDto) {
    return this.userFilterService.getPublicUserList(cursorPaginationDto);
  }

  @Get('filtered-list')
  @ApiOperation({
    summary: '필터된 회원목록 조회',
    description: '필터된 회원목록 조회, 로그인 유저ID(없으면 비로그인)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: '커서 값',
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

  @Public()
  @Get('public-filtered-list')
  @ApiOperation({
    summary: '비로그인 필터된 회원목록 조회',
    description: '비로그인 필터된 회원목록 조회',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: '커서 값',
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
