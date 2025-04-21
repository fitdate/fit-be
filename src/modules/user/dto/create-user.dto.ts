import { Exclude, Expose } from 'class-transformer';
import { Entity } from 'typeorm';
import { BaseTable } from 'src/common/entity/base-table.entity';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Matches,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { UserRole } from 'src/common/enum/user-role.enum';
import { AuthProvider } from 'src/modules/auth/types/oatuth.types';
import { ApiProperty } from '@nestjs/swagger';
@Entity()
export class CreateUserDto extends BaseTable {
  @ApiProperty({
    description: '이메일',
    example: 'fitdatepog@naver.com',
  })
  @Expose()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      '비밀번호 : 최소 8자, 최대 16자이며, 영문 대소문자, 숫자, 특수문자를 포함해야 합니다.',
    example: 'Fitdate123!',
  })
  @Exclude()
  @IsString()
  @IsNotEmpty()
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
  @Expose()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(15)
  name: string;

  @ApiProperty({
    description: '닉네임: 최소 2자, 최대 10자',
    example: 'iluvfitdate',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(10)
  nickname: string;

  @Expose()
  @IsOptional()
  profileImage?: string[];

  @ApiProperty({
    description: '생년월일',
    example: '1990-01-01',
  })
  @Expose()
  @IsDateString()
  @IsNotEmpty()
  birthday: string;

  @ApiProperty({
    description: '성별 (male, female)',
    example: 'male',
  })
  @Expose()
  @IsEnum(['male', 'female'])
  @IsNotEmpty()
  gender: 'male' | 'female';

  @ApiProperty({
    description: '전화번호',
    example: '01012345678',
  })
  @Expose()
  @IsString()
  @IsOptional()
  @Matches(/^010\d{8}$/, {
    message: '전화번호는 010으로 시작하는 11자리 숫자여야 합니다.',
  })
  phone?: string;

  @ApiProperty({
    description: '주소',
    example: '서울특별시',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  address: string;

  @Expose()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    description: '사용자 역할',
    example: 'user',
    enum: UserRole,
    default: UserRole.USER,
  })
  @Expose()
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @Expose()
  @IsBoolean()
  @IsNotEmpty()
  isProfileComplete: boolean;

  @Expose()
  @IsEnum(AuthProvider)
  @IsNotEmpty()
  authProvider: AuthProvider;
}
