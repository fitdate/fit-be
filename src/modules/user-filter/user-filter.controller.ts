import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UserFilterService } from './user-filter.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { UserFilter } from './entities/user-filter.entity';

@Controller('user-filter')
export class UserFilterController {
  constructor(private readonly userFilterService: UserFilterService) {}

  @Get('filtered-users')
  getFilteredUsers(@UserId() userId: string) {
    return this.userFilterService.getFilteredUsers(userId);
  }

  @Get('user-filter')
  getUserFilter(@UserId() userId: string) {
    return this.userFilterService.getUserFilter(userId);
  }

  @Patch('user-filter')
  updateUserFilter(@UserId() userId: string, @Body() userFilter: UserFilter) {
    return this.userFilterService.updateFilter(userId, userFilter);
  }
}
