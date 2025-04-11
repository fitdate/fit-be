import { IsNotEmpty, IsString, IsArray, IsUUID } from 'class-validator';

export class CreateChatRoomDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  participants: string[];
}
