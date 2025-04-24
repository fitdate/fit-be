import { IsNotEmpty, IsString } from 'class-validator';

export class SendCoffeeChatDto {
  @IsNotEmpty()
  @IsString()
  receiverId: string;
}
