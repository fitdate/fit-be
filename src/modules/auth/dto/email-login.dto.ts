import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class EmailLoginDto {
  @ApiProperty({
    description: '이메일',
    example: 'fitdatepog@naver.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      '비밀번호 : 최소 8자, 최대 16자이며, 영문 대소문자, 숫자, 특수문자를 포함해야 합니다.',
    example: 'Fitdate123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(16)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/,
    {
      message:
        '비밀번호는 최소 8자, 최대 16자이며, 영문 대소문자, 숫자, 특수문자를 포함해야 합니다.',
    },
  )
  password: string;
}
