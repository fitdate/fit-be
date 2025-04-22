import { Controller } from '@nestjs/common';
import { UserListService } from './user-list.service';

@Controller('user-list')
export class UserListController {
  constructor(private readonly userListService: UserListService) {}
}
