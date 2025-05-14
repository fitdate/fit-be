import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { Expose } from 'class-transformer';
import { AuthProvider } from 'src/modules/auth/types/oatuth.types';

export class CreateUserSocialDto extends BaseTable {
  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsString()
  @IsOptional()
  name?: string;

  @Expose()
  @IsEnum(AuthProvider)
  @IsNotEmpty()
  authProvider: AuthProvider;

  @Expose()
  @IsBoolean()
  @IsOptional()
  isProfileComplete?: boolean;

  @Expose()
  @IsString()
  @IsOptional()
  password?: string | null;
}
