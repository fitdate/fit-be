import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/common/enum/user-role.enum';

export class RegisterDto {
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

  @ApiProperty({
    description: '이름: 최소 2자, 최대 15자',
    example: '핏좋아',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(15)
  name: string;

  @ApiProperty({
    description: '닉네임',
    example: 'iluvfitdate',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  nickname: string;

  @ApiProperty({
    description: '생년월일',
    example: '1990-01-01',
  })
  @IsDateString()
  birthday: string;

  @ApiProperty({
    description: '성별 (male, female)',
    example: 'male',
  })
  @IsIn(['male', 'female'])
  @IsNotEmpty()
  gender: 'male' | 'female';

  @ApiProperty({
    description: '전화번호',
    example: '01012345678',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: '주소',
    example: '서울특별시 강남구',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: '사용자 역할',
    example: 'user',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  role: UserRole = UserRole.USER;
}
