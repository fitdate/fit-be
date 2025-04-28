import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class SendCoffeeChatDto {
  @ApiProperty({ description: '커피챗 받는 사람의 ID' })
  @IsNotEmpty()
  @IsString()
  receiverId: string;
}
