import { Injectable, Logger } from '@nestjs/common';
import { LikeService } from '../like/like.service';
import { CoffeeChatService } from '../coffee-chat/coffee-chat.service';
import { MatchService } from '../match/match.service';
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
    // const filteredLikeList = likeList.map((like) => ({
    //   likedUserId: like.likedUser.id,
    //   nickname: like.likedUser.nickname,
    //   likes: like.likedUser.likeCount,
    //   age: like.likedUser.age,
    //   region: like.likedUser.region,
    //   profileImage: like.likedUser.profile.profileImage?.[0]?.imageUrl ?? null,
    // }));
    return likeList;
  }

  async getCoffeeChatList(userId: string) {
    const coffeeChatList =
      await this.coffeeChatService.getCoffeeChatList(userId);
    // const filteredCoffeeChatList = coffeeChatList.map((coffeeChat) => ({
    //   coffeeChatId: coffeeChat.id,
    //   senderId: coffeeChat.sender.id,
    //   senderNickname: coffeeChat.sender.nickname,
    //   senderProfileImage:
    //     coffeeChat.sender.profile.profileImage?.[0]?.imageUrl ?? null,
    //   senderAge: coffeeChat.sender.age,
    //   senderRegion: coffeeChat.sender.region,
    //   receiverId: coffeeChat.receiver.id,
    //   receiverNickname: coffeeChat.receiver.nickname,
    //   receiverProfileImage:
    //     coffeeChat.receiver.profile.profileImage?.[0]?.imageUrl ?? null,
    //   receiverAge: coffeeChat.receiver.age,
    //   receiverRegion: coffeeChat.receiver.region,
    // }));
    return coffeeChatList;
  }

  async getMatchList(userId: string) {
    this.logger.debug(`[getMatchList] 시작 - userId: ${userId}`);
    
    const matchList = await this.matchService.getUserMatchList(userId);
    this.logger.debug(`[getMatchList] 매치 리스트 개수: ${matchList.length}`);
    
    const filteredMatchList = matchList.map((match) => {
      const matchedUser = match.user1.id === userId ? match.user2 : match.user1;
      this.logger.debug(`[getMatchList] 매칭된 사용자 정보:`);
      this.logger.debug(`- ID: ${matchedUser.id}`);
      this.logger.debug(`- 닉네임: ${matchedUser.nickname}`);
      this.logger.debug(`- 프로필 존재: ${!!matchedUser.profile}`);
      this.logger.debug(`- 프로필 이미지 개수: ${matchedUser.profile?.profileImage?.length ?? 0}`);
      this.logger.debug(`- 첫 번째 프로필 이미지 URL: ${matchedUser.profile?.profileImage?.[0]?.imageUrl ?? 'null'}`);
      
      const profileImage = matchedUser.profile?.profileImage?.[0];
      return {
        matchId: match.id,
        matchedUserId: matchedUser.id,
        matchedNickname: matchedUser.nickname,
        matchedProfileImage: profileImage ? profileImage.imageUrl : null,
        matchedAge: matchedUser.age,
        matchedRegion: matchedUser.region,
        matchedLikeCount: matchedUser.likeCount,
      };
    });
    return filteredMatchList;
  }

  async getSparkList(userId: string) {
    const likeList = await this.getLikeList(userId);
    const coffeeChatList = await this.getCoffeeChatList(userId);
    const matchList = await this.getMatchList(userId);
    return { likeList, coffeeChatList, matchList };
  }
}
