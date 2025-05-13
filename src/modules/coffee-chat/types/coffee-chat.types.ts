import { NotificationType } from 'src/common/enum/notification.enum';
import { CoffeeChatStatus } from '../enum/coffee-chat-statue.enum';
import { User } from 'src/modules/user/entities/user.entity';

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

export interface CoffeeChatResponse {
  senderId: string;
  receiverId: string;
  coffeeChatId?: string;
  chatRoomId?: string;
  type: NotificationType;
  status: CoffeeChatStatus;
}

export interface CoffeeChatUser extends User {
  coffee: number;
  nickname: string;
}
