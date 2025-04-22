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
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/common/enum/user-role.enum';
import { CreateProfileDto } from 'src/modules/profile/dto/create-profile.dto';
import { CreateUserMbtiDto } from 'src/modules/profile/mbti/dto/create-mbti.dto';
import { CreateUserFeedbackDto } from 'src/modules/profile/feedback/dto/create-user-feedback.dto';
import { CreateUserIntroductionDto } from 'src/modules/profile/introduction/dto/create-user-introduction.dto';
import { CreateUserInterestCategoryDto } from 'src/modules/profile/interest-category/dto/create-user-interest-category.dto';
import { CreateProfileImageDto } from 'src/modules/profile/profile-image/dto/create-profile-image.dto';
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
    description: '닉네임: 최소 2자, 최대 10자',
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
    description: '성별 (남자, 여자)',
    example: '남자',
  })
  @IsIn(['남자', '여자'])
  @IsNotEmpty()
  gender: '남자' | '여자';

  @ApiProperty({
    description: '전화번호',
    example: '01012345678',
  })
  @IsString()
  @IsOptional()
  @Matches(/^010\d{8}$/, {
    message: '전화번호는 010으로 시작하는 11자리 숫자여야 합니다.',
  })
  phone: string;

  @ApiProperty({
    description: '지역',
    example: '서울',
  })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({
    description: '사용자 역할',
    example: 'user',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  role: UserRole = UserRole.USER;

  @ApiProperty({
    description: '프로필 정보',
    type: CreateProfileDto,
  })
  @IsOptional()
  profile?: CreateProfileDto;

  @ApiProperty({
    description: 'MBTI 정보',
    type: CreateUserMbtiDto,
  })
  @IsOptional()
  mbti?: CreateUserMbtiDto;

  @ApiProperty({
    description: '피드백 정보',
    type: CreateUserFeedbackDto,
  })
  @IsOptional()
  feedback?: CreateUserFeedbackDto;

  @ApiProperty({
    description: '소개 정보',
    type: CreateUserIntroductionDto,
  })
  @IsOptional()
  introduction?: CreateUserIntroductionDto;

  @ApiProperty({
    description: '관심 카테고리 정보',
    type: CreateUserInterestCategoryDto,
  })
  @IsOptional()
  interestCategory?: CreateUserInterestCategoryDto;

  @ApiProperty({
    description: '프로필 이미지 정보',
    type: CreateProfileImageDto,
  })
  @IsOptional()
  profileImageUrls?: CreateProfileImageDto[];

  @ApiProperty({
    description: '직업',
    example: '개발자',
  })
  @IsString()
  @IsOptional()
  job?: string;

  @ApiProperty({
    description: '소개',
    example: '안녕하세요!',
  })
  @IsString()
  @IsOptional()
  intro?: string;
}
