import { IsString } from 'class-validator';

export class AcceptCoffeeChatDto {
  @IsString()
  chatId: string;
}
