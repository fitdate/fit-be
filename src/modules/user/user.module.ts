import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStatisticsService } from './services/user-statistics.service';
import { LocationModule } from '../location/location.module';
import { FilterModule } from '../filter/filter.module';
import { CursorPaginationUtil } from 'src/common/util/cursor-pagination.util';
@Module({
  imports: [TypeOrmModule.forFeature([User]), LocationModule, FilterModule],
  controllers: [UserController],
  providers: [UserService, UserStatisticsService, CursorPaginationUtil],
  exports: [
    UserService,
    UserStatisticsService,
    TypeOrmModule.forFeature([User]),
  ],
})
export class UserModule {}
