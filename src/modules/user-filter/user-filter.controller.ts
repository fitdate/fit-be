import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UserFilterService } from './user-filter.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserFilterDto } from './dto/user-filter.dto';
import { OptionalUserId } from 'src/common/decorator/optional-user.decorator';
@ApiTags('User Filter')
@Controller('user-filter')
export class UserFilterController {
  constructor(private readonly userFilterService: UserFilterService) {}

  @Get('filtered-users')
  getFilteredUsers(@OptionalUserId() userId?: string) {
    return this.userFilterService.getFilteredUsers(userId);
  }

  @Get('user-filter')
  getUserFilter(@UserId() userId: string) {
    return this.userFilterService.getUserFilter(userId);
  }

  @ApiOperation({ summary: '유저 필터 업데이트' })
  @ApiResponse({ status: 200, description: '유저 필터 업데이트 성공' })
  @Patch('user-filter')
  updateUserFilter(
    @UserId() userId: string,
    @Body() userFilterDto: UserFilterDto,
  ) {
    return this.userFilterService.updateFilter(userId, userFilterDto);
  }
}
