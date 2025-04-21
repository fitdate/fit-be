import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateProfileImageDto {
  @ApiProperty({
    description: '프로필 이미지들',
    example: [
      'profile-image-1.jpg',
      'profile-image-2.jpg',
      'profile-image-3.jpg',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  profileImageName?: string[];

  @IsString()
  profileId: string;
}
