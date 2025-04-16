import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStatisticsService } from './services/user-statistics.service';
import { Profile } from '../profile/entities/profile.entity';
import { InterestLocation } from '../profile/interest-location/entities/interest-location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Profile, InterestLocation])],
  controllers: [UserController],
  providers: [UserService, UserStatisticsService],
  exports: [UserService, UserStatisticsService],
})
export class UserModule {}
