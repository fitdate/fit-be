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
    this.logger.debug(`[getMatchList] 시작 - userId: ${userId}`);

    const selectorsList = await this.matchService.getSelectorsList(userId);
    this.logger.debug(
      `[getMatchList] 선택자 리스트 개수: ${selectorsList.length}`,
    );

    const filteredSelectorsList = selectorsList.map((selection) => {
      const selector = selection.selector;
      this.logger.debug(`[getMatchList] 선택자 정보:`);
      this.logger.debug(`- ID: ${selector.id}`);
      this.logger.debug(`- 닉네임: ${selector.nickname}`);
      this.logger.debug(`- 프로필 존재: ${!!selector.profile}`);
      this.logger.debug(
        `- 프로필 이미지 개수: ${selector.profile?.profileImage?.length ?? 0}`,
      );
      this.logger.debug(
        `- 첫 번째 프로필 이미지 URL: ${selector.profile?.profileImage?.[0]?.imageUrl ?? 'null'}`,
      );

      const profileImage = selector.profile?.profileImage?.[0];
      return {
        selectionId: selection.id,
        selectorId: selector.id,
        selectorNickname: selector.nickname,
        selectorLikeCount: selector.likeCount,
        selectorAge: calculateAge(selector.birthday),
        selectorRegion: selector.region,
        selectorProfileImage: profileImage ? profileImage.imageUrl : null,
      };
    });
    return filteredSelectorsList;
  }

  async getSparkList(userId: string) {
    const likeList = await this.getLikeList(userId);
    const coffeeChatList = await this.getCoffeeChatList(userId);
    const matchList = await this.getMatchList(userId);
    return { likeList, coffeeChatList, matchList };
  }
}
