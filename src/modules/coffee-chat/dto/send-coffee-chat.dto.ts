import { IsNotEmpty, IsString } from 'class-validator';

export class SendCoffeeChatDto {
  @IsNotEmpty()
  @IsString()
  coffeeChatId: string;

  @IsNotEmpty()
  @IsString()
  receiverId: string;
}
