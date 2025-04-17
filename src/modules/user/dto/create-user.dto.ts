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
} from 'class-validator';
import { UserRole } from 'src/common/enum/user-role.enum';
import { AuthProvider } from 'src/modules/auth/types/oatuth.types';

@Entity()
export class CreateUserDto extends BaseTable {
  @Expose()
  @IsEmail()
  email: string;

  @Exclude()
  @IsString()
  @IsNotEmpty()
  password: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @Expose()
  @IsOptional()
  profileImage?: string[];

  @Expose()
  @IsString()
  @IsNotEmpty()
  birthday: string;

  @Expose()
  @IsEnum(['male', 'female'])
  @IsNotEmpty()
  gender: 'male' | 'female';

  @Expose()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

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
