export interface UserSummary {
  id: string;
  nickname: string;
  region: string;
  likeCount: number;
  age: number;
  profileImage: string | null;
}

export interface CoffeeChatReturn {
  sender?: UserSummary;
  receiver?: UserSummary;
  acceptedAt?: Date;
}
