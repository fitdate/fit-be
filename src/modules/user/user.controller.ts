import { Controller, Post, Body, Patch, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { SkipProfileComplete } from '../auth/guard/profile-complete.guard';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password-dto';
import { Public } from 'src/common/decorator/public.decorator';
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
  @Public()
  getUserInfo(@Param('userId') userId: string): Promise<any> {
    return this.userService.getUserInfo(userId);
  }

  @ApiOperation({
    summary: '모든 사용자 정보 조회',
    description: '모든 사용자의 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '모든 사용자의 정보를 성공적으로 조회했습니다.',
  })
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

  @ApiOperation({
    summary: '닉네임으로 사용자 조회',
    description: '닉네임으로 사용자를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '닉네임으로 사용자를 성공적으로 조회했습니다.',
  })
  @Get('user-nickname/:nickname')
  getUserNickname(@Param('nickname') nickname: string) {
    return this.userService.findUserByNickname(nickname);
  }

  @ApiOperation({
    summary: '비밀번호 변경',
    description: '현재 로그인한 사용자의 비밀번호를 변경합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '비밀번호가 성공적으로 변경되었습니다.',
  })
  @ApiParam({
    name: 'oldPassword',
    description: '기존 비밀번호',
  })
  @ApiParam({
    name: 'newPassword',
    description: '새로운 비밀번호',
  })
  @Patch('change-password')
  changePassword(
    @UserId() userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(
      userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  @Get('user-coffee')
  @ApiOperation({
    summary: '사용자 커피 조회',
    description: '사용자의 커피 개수를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 커피 개수를 성공적으로 조회했습니다.',
  })
  getUserCoffee(@UserId() userId: string) {
    return this.userService.getUserCoffee(userId);
  }
}
