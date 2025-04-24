import { Injectable } from '@nestjs/common';
import { LikeService } from '../like/like.service';
import { CoffeeChatService } from '../coffee-chat/coffee-chat.service';
import { MatchService } from '../match/match.service';
@Injectable()
export class SparkListService {
  constructor(
    private readonly likeService: LikeService,
    private readonly coffeeChatService: CoffeeChatService,
    private readonly matchService: MatchService,
  ) {}

  async getLikeList(userId: string) {
    const likeList = await this.likeService.getLikeList(userId);
    return likeList;
  }

  async getCoffeeChatList(userId: string) {
    const coffeeChatList =
      await this.coffeeChatService.getCoffeeChatList(userId);
    return coffeeChatList;
  }

  async getMatchList(userId: string) {
    const matchList = await this.matchService.getUserMatchList(userId);
    return matchList;
  }

  async getSparkList(userId: string) {
    const likeList = await this.getLikeList(userId);
    const coffeeChatList = await this.getCoffeeChatList(userId);
    const matchList = await this.getMatchList(userId);
    return { likeList, coffeeChatList, matchList };
  }
}
