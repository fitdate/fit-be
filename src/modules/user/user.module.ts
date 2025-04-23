import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStatisticsService } from './services/user-statistics.service';
import { LocationModule } from '../location/location.module';
import { UserFilterModule } from '../user-filter/user-filter.module';
import { FilterModule } from '../filter/filter.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    LocationModule,
    UserFilterModule,
    FilterModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserStatisticsService],
  exports: [
    UserService,
    UserStatisticsService,
    TypeOrmModule.forFeature([User]),
  ],
})
export class UserModule {}
