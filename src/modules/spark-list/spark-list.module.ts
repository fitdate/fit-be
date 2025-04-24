import { Module } from '@nestjs/common';
import { SparkListService } from './spark-list.service';
import { SparkListController } from './spark-list.controller';
import { LikeModule } from '../like/like.module';
import { CoffeeChatModule } from '../coffee-chat/coffee-chat.module';
import { MatchModule } from '../match/match.module';

@Module({
  imports: [LikeModule, CoffeeChatModule, MatchModule],
  controllers: [SparkListController],
  providers: [SparkListService],
})
export class SparkListModule {}
