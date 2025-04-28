import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendCoffeeChatDto {
  @ApiProperty({
    description: '커피챗 받는 사람의 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  receiverId: string;
}
