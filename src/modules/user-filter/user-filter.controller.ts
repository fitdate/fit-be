import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UserFilterService } from './user-filter.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserFilterDto } from './dto/user-filter.dto';
import { Public } from 'src/common/decorator/public.decorator';

@ApiTags('User Filter')
@Controller('user-filter')
export class UserFilterController {
  constructor(private readonly userFilterService: UserFilterService) {}

  @Public()
  @Get('users-for-anonymous-user')
  @ApiOperation({ summary: '익명 사용자의 유저 조회' })
  @ApiResponse({ status: 200, description: '익명 사용자의 유저 조회 성공' })
  @ApiResponse({ status: 400, description: '익명 사용자의 유저 조회 실패' })
  getUsersForanonymousUser() {
    return this.userFilterService.getUsersForanonymousUser();
  }

  @Get('filtered-users')
  @ApiOperation({ summary: '필터링된 유저 조회' })
  @ApiResponse({ status: 200, description: '필터링된 유저 조회 성공' })
  @ApiResponse({ status: 400, description: '필터링된 유저 조회 실패' })
  getFilteredUsers(@UserId() userId: string) {
    return this.userFilterService.getFilteredUsers(userId);
  }

  @Get('user-filter')
  @ApiOperation({ summary: '유저 필터 조회' })
  @ApiResponse({ status: 200, description: '유저 필터 조회 성공' })
  @ApiResponse({ status: 400, description: '유저 필터 조회 실패' })
  getUserFilter(@UserId() userId: string) {
    return this.userFilterService.getUserFilter(userId);
  }

  @ApiOperation({ summary: '유저 필터 업데이트' })
  @ApiResponse({
    status: 200,
    description: '유저 필터 업데이트 성공',
    schema: {
      default: { minAge: 20, maxAge: 60, minLikeCount: 0, region: '' },
    },
  })
  @ApiResponse({ status: 400, description: '유저 필터 업데이트 실패' })
  @ApiBody({ type: UserFilterDto })
  @Patch('user-filter')
  updateUserFilter(
    @UserId() userId: string,
    @Body() userFilterDto: UserFilterDto,
  ) {
    return this.userFilterService.updateFilter(userId, userFilterDto);
  }
}
