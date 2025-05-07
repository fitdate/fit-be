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
import { ProfileImageModule } from '../profile/profile-image/profile-image.module';
import { ProfileModule } from '../profile/profile.module';
import { FeedbackModule } from '../profile/feedback/common/feedback.module';
import { IntroductionModule } from '../profile/introduction/common/introduction.module';
import { InterestCategoryModule } from '../profile/interest-category/common/interest-category.module';
import { S3Module } from '../s3/s3.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    LocationModule,
    FilterModule,
    RedisModule,
    ProfileImageModule,
    ProfileModule,
    FeedbackModule,
    IntroductionModule,
    InterestCategoryModule,
    S3Module,
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
