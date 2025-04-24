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
    const matchList = await this.matchService.getUserMatchList(userId);
    // const filteredMatchList = matchList.map((match) => {
    //   const matchedUser = match.user1.id === userId ? match.user2 : match.user1;

    //   return {
    //     matchId: match.id,
    //     matchedUserId: matchedUser.id,
    //     matchedNickname: matchedUser.nickname,
    //     matchedProfileImage:
    //       matchedUser.profile.profileImage?.[0]?.imageUrl ?? null,
    //     matchedAge: matchedUser.age,
    //     matchedRegion: matchedUser.region,
    //   };
    // });
    return matchList;
  }

  async getSparkList(userId: string) {
    const likeList = await this.getLikeList(userId);
    const coffeeChatList = await this.getCoffeeChatList(userId);
    const matchList = await this.getMatchList(userId);
    return { likeList, coffeeChatList, matchList };
  }
}
