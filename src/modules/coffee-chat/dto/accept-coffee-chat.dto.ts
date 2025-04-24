import { IsString } from 'class-validator';

export class AcceptCoffeeChatDto {
  @IsString()
  senderId: string;
}
