import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: '이메일로 받은 6자리 인증 코드',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다.' })
  code: string;
}
