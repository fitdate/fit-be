import { IsNotEmpty, IsString, IsArray, IsUUID } from 'class-validator';

export class UpdateChatRoomDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  participants: string[];
}
