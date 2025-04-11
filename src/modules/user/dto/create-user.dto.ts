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
} from 'class-validator';
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
}
