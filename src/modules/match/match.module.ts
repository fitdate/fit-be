import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { ProfileModule } from '../profile/profile.module';
import { Match } from './entities/match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Match]), ProfileModule],
  controllers: [MatchController],
  providers: [MatchService],
})
export class MatchModule {}
