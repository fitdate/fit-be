import { Module } from '@nestjs/common';
import { UserListService } from './user-list.service';
import { UserListController } from './user-list.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserList } from './entities/user-list.entity';
import { UserModule } from '../user/user.module';
@Module({
  imports: [TypeOrmModule.forFeature([UserList]), UserModule],
  controllers: [UserListController],
  providers: [UserListService],
})
export class UserListModule {}
