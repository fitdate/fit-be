import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { Match } from './entities/match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Match]), NotificationModule, UserModule],
  controllers: [MatchController],
  providers: [MatchService],
})
export class MatchModule {}
