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
      const profileImage = like.likedUser.profile?.profileImage?.[0];
      return {
        likedUserId: like.likedUser.id,
        nickname: like.likedUser.nickname,
        likeCount: like.likedUser.likeCount,
        age: calculateAge(like.likedUser.birthday),
        region: like.likedUser.region,
        profileImage: profileImage ? profileImage.imageUrl : null,
      };
    });
    return filteredLikeList;
  }

  async getCoffeeChatList(userId: string) {
    const coffeeChatList =
      await this.coffeeChatService.getCoffeeChatList(userId);
    const filteredCoffeeChatList = coffeeChatList.map((coffeeChat) => {
      const profileImage = coffeeChat.receiver.profile?.profileImage?.[0];
      return {
        coffeeChatId: coffeeChat.id,
        receiverId: coffeeChat.receiver.id,
        receiverNickname: coffeeChat.receiver.nickname,
        receiverLikeCount: coffeeChat.receiver.likeCount,
        receiverAge: calculateAge(coffeeChat.receiver.birthday),
        receiverRegion: coffeeChat.receiver.region,
        receiverProfileImage: profileImage ? profileImage.imageUrl : null,
      };
    });
    return filteredCoffeeChatList;
  }

  async getMatchList(userId: string) {
    const selectorsList = await this.matchService.getSelectorsList(userId);
    const matchList = selectorsList
      .map((selection) => {
        const matchedUser =
          selection.selector.id === userId
            ? selection.selected
            : selection.selector;

        if (!matchedUser) {
          return null;
        }

        this.logger.debug(`[getMatchList] 사용자 ID: ${matchedUser.id}`);
        this.logger.debug(
          `[getMatchList] 프로필 존재 여부: ${!!matchedUser.profile}`,
        );
        this.logger.debug(
          `[getMatchList] 프로필 이미지 배열: ${JSON.stringify(matchedUser.profile?.profileImage)}`,
        );

        const profileImage = matchedUser.profile?.profileImage?.[0];
        this.logger.debug(
          `[getMatchList] 첫 번째 프로필 이미지 객체: ${JSON.stringify(profileImage)}`,
        );

        return {
          matchedUserId: matchedUser.id,
          nickname: matchedUser.nickname,
          likeCount: matchedUser.likeCount,
          age: calculateAge(matchedUser.birthday),
          region: matchedUser.region,
          profileImage: profileImage ? profileImage.imageUrl : null,
        };
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
