import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { Profile } from '../profile/entities/profile.entity';
import { ProfileImage } from '../profile/profile-image/entities/profile-image.entity';
import { User } from '../user/entities/user.entity';
import { MatchSelection } from './entities/match-selection.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match,
      Profile,
      ProfileImage,
      User,
      MatchSelection,
    ]),
    NotificationModule,
    UserModule,
  ],
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService],
})
export class MatchModule {}
