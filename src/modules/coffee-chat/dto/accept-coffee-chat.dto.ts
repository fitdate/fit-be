import { IsString } from 'class-validator';

export class AcceptCoffeeChatDto {
  @IsString()
  senderId: string;

  @IsString()
  receiverId: string;
}
