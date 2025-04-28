import { Injectable, Logger } from '@nestjs/common';
import { LikeService } from '../like/like.service';
import { CoffeeChatService } from '../coffee-chat/coffee-chat.service';
import { MatchService } from '../match/match.service';
import { calculateAge } from 'src/common/util/age-calculator.util';

@Injectable()
export class SparkListService {
  private readonly logger = new Logger(SparkListService.name);

  constructor(
    private readonly likeService: LikeService,
    private readonly coffeeChatService: CoffeeChatService,
    private readonly matchService: MatchService,
  ) {}

  async getLikeList(userId: string) {
    const likeList = await this.likeService.getLikeList(userId);
    const filteredLikeList = likeList.map((like) => {
      const profileImage = like.user.profile?.profileImage?.[0];
      return {
        likedUserId: like.user.id,
        nickname: like.user.nickname,
        likeCount: like.user.likeCount,
        age: calculateAge(like.user.birthday),
        region: like.user.region,
        profileImage: profileImage ? profileImage.imageUrl : null,
      };
    });
    return filteredLikeList;
  }

  async getCoffeeChatList(userId: string) {
    const coffeeChatList =
      await this.coffeeChatService.getReceivedCoffeeChatList(userId);
    const filteredCoffeeChatList = coffeeChatList.map((coffeeChat) => {
      const profileImage = coffeeChat.sender.profile?.profileImage?.[0];
      return {
        coffeeChatUserId: coffeeChat.sender.id,
        nickname: coffeeChat.sender.nickname,
        likeCount: coffeeChat.sender.likeCount,
        age: calculateAge(coffeeChat.sender.birthday),
        region: coffeeChat.sender.region,
        profileImage: profileImage ? profileImage.imageUrl : null,
      };
    });
    return filteredCoffeeChatList;
  }

  async getMatchList(userId: string) {
    const selectorsList = await this.matchService.getSelectorsList(userId);

    const matchList = selectorsList
      .map((selection) => {
        if (!selection.selector || !selection.selected) {
          return null;
        }

        // 로그인한 사용자가 선택받은 경우만 처리
        if (selection.selected.id === userId) {
          const matchedUser = selection.selector;
          const profileImage = matchedUser.profile?.profileImage?.[0];

          return {
            matchedUserId: matchedUser.id,
            nickname: matchedUser.nickname,
            likeCount: matchedUser.likeCount,
            age: calculateAge(matchedUser.birthday),
            region: matchedUser.region,
            profileImage: profileImage ? profileImage.imageUrl : null,
          };
        }

        return null;
      })
      .filter(Boolean);

    return matchList;
  }

  async getSparkList(userId: string) {
    const likeList = await this.getLikeList(userId);
    const coffeeChatList = await this.getCoffeeChatList(userId);
    const matchList = await this.getMatchList(userId);
    return { likeList, coffeeChatList, matchList };
  }
}
