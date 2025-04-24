import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStatisticsService } from './services/user-statistics.service';
import { LocationModule } from '../location/location.module';
import { FilterModule } from '../filter/filter.module';
import { CursorPaginationUtil } from 'src/common/util/cursor-pagination.util';
import { RedisModule } from '../redis/redis.module';
import { HashService } from '../auth/hash/hash.service';
import { BcryptService } from '../auth/hash/bcrypt.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    LocationModule,
    FilterModule,
    RedisModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserStatisticsService,
    CursorPaginationUtil,
    { provide: HashService, useClass: BcryptService },
  ],
  exports: [UserService, UserStatisticsService, HashService],
})
export class UserModule {}
