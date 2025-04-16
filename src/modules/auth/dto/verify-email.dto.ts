import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: '이메일',
    example: 'fitdatepog@naver.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
