import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: '이메일',
    example: 'example@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'password123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(16)
  password: string;

  @ApiProperty({
    description: '비밀번호 확인',
    example: 'password123!',
  })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;

  @ApiProperty({
    description: '이름',
    example: '홍길동',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: '키',
    example: 170,
  })
  @IsNumber()
  @IsNotEmpty()
  height: number;

  @ApiProperty({
    description: '닉네임',
    example: 'nickname',
  })
  @IsNotEmpty()
  @IsString()
  nickname: string;

  @ApiProperty({
    description: '생년월일',
    example: '1990-01-01',
  })
  @IsDateString()
  birthday: string;

  @ApiProperty({
    description: '성별',
    example: '남자',
  })
  @IsIn(['남자', '여자'])
  @IsNotEmpty()
  gender: '남자' | '여자';

  @ApiProperty({
    description: '전화번호',
    example: '010-1234-5678',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: '지역',
    example: '서울',
  })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({
    description: '직업',
    example: '개발자',
  })
  @IsString()
  @IsNotEmpty()
  job: string;

  @ApiProperty({
    description: 'MBTI',
    example: ['ISTJ'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mbti?: string;

  @ApiProperty({
    description: '자기소개',
    example: ['웃음이 많아요'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selfintro?: string[];

  @ApiProperty({
    description: '듣고 싶은 말',
    example: ['동안'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  listening?: string[];

  @ApiProperty({
    description: '관심사',
    example: ['운동', '영화'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiProperty({
    description: '프로필 이미지 URL 배열',
    example: [
      'https://fit-aws-bucket.s3.ap-northeast-2.amazonaws.com/temp/xxx.png',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
