import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptCoffeeChatDto {
  @ApiProperty({
    description: '커피챗을 보낸 상대방의 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  partnerId: string;
}
