import { Controller, Post, Body, Patch, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserId } from 'src/common/decorator/get-user.decorator';
import { SkipProfileComplete } from '../auth/guard/profile-complete.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @SkipProfileComplete()
  @Patch()
  update(@Body() updateUserDto: UpdateUserDto, @UserId() userId: string) {
    return this.userService.updateUser(userId, updateUserDto);
  }

  @SkipProfileComplete()
  @Patch('complete-profile')
  completeProfile(
    @Body() updateUserDto: UpdateUserDto,
    @UserId() userId: string,
  ) {
    return this.userService.completeUserProfile(userId, updateUserDto);
  }

  @Get('me')
  getMyProfile(@UserId() userId: string) {
    return this.userService.findOne(userId);
  }
}
