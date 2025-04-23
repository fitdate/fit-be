import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserList } from './entities/user-list.entity';
import { UserService } from '../user/user.service';
import { Repository } from 'typeorm';
import { FilterUsersDto } from '../user/dto/filter-user.dto';

@Injectable()
export class UserListService {
  constructor(
    @InjectRepository(UserList)
    private readonly userListRepository: Repository<UserList>,
    private readonly userService: UserService,
  ) {}

  async BaseUserList(userId: string, filter: FilterUsersDto) {
    // const user = await this.userService.getAllUserInfo();
    // const userFilter = await this.userService.getFilteredUsers(filter, userId);

    //user.gender 반대

    //profile.mbti recommend

    //profile.selfintro 일치 점수

    //profile.listening 일치 점수

    //profile.interests 일치 점수

    //user.region 일치 점수
  }
}
