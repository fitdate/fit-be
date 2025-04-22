import { PartialType } from '@nestjs/mapped-types';
import { CreateProfileImageDto } from './create-profile-image.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateProfileImageDto extends PartialType(CreateProfileImageDto) {
  @ApiProperty({
    description: '삭제(교체)할 프로필 이미지 이름',
    example: 'old-profile.jpg',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  oldImageNames?: string[];

  @ApiProperty({
    description: '기존 이미지 ID 목록',
    example: ['UUID', 'UUID'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  oldImageIds: string[] = [];
}
