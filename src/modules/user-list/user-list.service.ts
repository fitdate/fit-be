import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserListDto } from './dto/user-list.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserList } from './entities/user-list.entity';
import { UserService } from '../user/user.service';
import { Repository } from 'typeorm';

@Injectable()
export class UserListService {
  constructor(
    @InjectRepository(UserList)
    private readonly userListRepository: Repository<UserList>,
    private readonly userService: UserService,
  ) {}
  filterUserList(userId: string, userListDto: CreateUserListDto) {}

  BaseUserList(userId: string) {
    const user = this.userService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다다');
    }
    
  }
}