import {
  Controller,
  Post,
  Body,
  Patch,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { SkipProfileComplete } from '../auth/guard/profile-complete.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FilteredUsersDto } from './dto/filtered-user.dto';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: '사용자 생성',
    description: '새로운 사용자를 생성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '사용자가 성공적으로 생성되었습니다.',
  })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @SkipProfileComplete()
  @ApiOperation({
    summary: '사용자 정보 수정',
    description: '현재 로그인한 사용자의 정보를 수정합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보가 성공적으로 수정되었습니다.',
  })
  @Patch()
  update(@Body() updateUserDto: UpdateUserDto, @UserId() userId: string) {
    return this.userService.updateUser(userId, updateUserDto);
  }

  @SkipProfileComplete()
  @ApiOperation({
    summary: '프로필 완성',
    description: '사용자의 프로필 정보를 완성합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '프로필이 성공적으로 완성되었습니다.',
  })
  @Patch('complete-profile')
  completeProfile(
    @Body() updateUserDto: UpdateUserDto,
    @UserId() userId: string,
  ) {
    return this.userService.completeUserProfile(userId, updateUserDto);
  }

  @ApiOperation({
    summary: '사용자 프로필 조회',
    description: '특정 사용자의 프로필 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 프로필 정보를 성공적으로 조회했습니다.',
  })
  @Get('user-info/:userId')
  getUserInfo(@Param('userId') userId: string): Promise<any> {
    return this.userService.getUserInfo(userId);
  }

  @Get('all-user-info')
  getAllUserInfo() {
    return this.userService.getAllUserInfo();
  }

  @ApiOperation({
    summary: '내 프로필 조회',
    description: '현재 로그인한 사용자의 프로필 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '내 프로필 정보를 성공적으로 조회했습니다.',
  })
  @Get('me')
  getMyProfile(@UserId() userId: string) {
    return this.userService.findOne(userId);
  }

  @Get('user-nickname/:nickname')
  getUserNickname(@Param('nickname') nickname: string) {
    return this.userService.findUserByNickname(nickname);
  }

  @Get('filtered-users')
  getFilteredUsers(
    @UserId() userId: string,
    @Query() filteredUsersDto: FilteredUsersDto,
    @Query() cursorPaginationDto: CursorPaginationDto,
  ) {
    return this.userService.getFilteredUsers(
      userId,
      filteredUsersDto,
      cursorPaginationDto,
    );
  }
}
