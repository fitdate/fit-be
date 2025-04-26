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

    const matchList = selectorsList.map((selection) => {
      const selector = selection.selector;
      this.logger.debug(`[getMatchList] 매칭 데이터 변환:`);
      this.logger.debug(`- 매칭 ID: ${selection.id}`);
      this.logger.debug(`- 유저 ID: ${selection.userId}`);
      this.logger.debug(`- 파트너 ID: ${selection.partnerId}`);
      this.logger.debug(`- 선택자 ID: ${selection.selectedBy}`);
      this.logger.debug(`- 선택자 닉네임: ${selector.nickname}`);
      this.logger.debug(`- 선택자 좋아요 수: ${selector.likeCount}`);
      this.logger.debug(`- 선택자 나이: ${calculateAge(selector.birthday)}`);
      this.logger.debug(`- 선택자 지역: ${selector.region}`);
      this.logger.debug(
        `- 선택자 프로필 이미지: ${selector.profile?.profileImage?.[0]?.imageUrl ?? '없음'}`,
      );

      const profileImage = selector.profile?.profileImage?.[0];
      return {
        id: selection.id,
        userId: selection.userId,
        partnerId: selection.partnerId,
        selectedBy: selection.selectedBy,
        selectorNickname: selector.nickname,
        selectorLikeCount: selector.likeCount,
        selectorAge: calculateAge(selector.birthday),
        selectorRegion: selector.region,
        selectorProfileImage: profileImage ? profileImage.imageUrl : null,
      };
    });

    this.logger.debug(
      `[getMatchList] 변환된 매칭 리스트 개수: ${matchList.length}`,
    );
    return matchList;
  }

  async getSparkList(userId: string) {
    const likeList = await this.getLikeList(userId);
    const coffeeChatList = await this.getCoffeeChatList(userId);
    const matchList = await this.getMatchList(userId);
    return { likeList, coffeeChatList, matchList };
  }
}
