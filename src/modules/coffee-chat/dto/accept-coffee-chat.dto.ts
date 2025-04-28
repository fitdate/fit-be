import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class AcceptCoffeeChatDto {
  @ApiProperty({ description: '보내는 사람의 ID' })
  @IsNotEmpty()
  @IsString()
  senderId: string;
}
