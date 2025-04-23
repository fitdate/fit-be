import {
  Controller,
  Get,
  Patch,
  Body,
  Request,
  Response,
} from '@nestjs/common';
import { UserFilterService } from './user-filter.service';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserFilterWrapperDto } from './dto/user-filter.dto';
import { Public } from 'src/common/decorator/public.decorator';
@ApiTags('User Filter')
@Controller('user-filter')
export class UserFilterController {
  constructor(private readonly userFilterService: UserFilterService) {}

  @Get('filtered-users')
  @Public()
  getFilteredUsers(@Request() request, @Response() response) {
    return this.userFilterService.getFilteredUsers(request, response);
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
    @Body() userFilterDto: InstanceType<typeof UserFilterWrapperDto>,
  ) {
    return this.userFilterService.updateFilter(userId, userFilterDto.filters);
  }
}
