import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStatisticsService } from './services/user-statistics.service';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), LocationModule],
  controllers: [UserController],
  providers: [UserService, UserStatisticsService],
  exports: [
    UserService,
    UserStatisticsService,
    TypeOrmModule.forFeature([User]),
  ],
})
export class UserModule {}
