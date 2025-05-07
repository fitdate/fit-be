import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class AcceptCoffeeChatDto {
  @ApiProperty({ description: '커피챗 아이디' })
  @IsNotEmpty()
  @IsString()
  coffeeChatId: string;
}
