import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateProfileImageDto {
  @ApiProperty({
    description: '프로필 이미지 이름들',
    example: [
      'profile-image-1.jpg',
      'profile-image-2.jpg',
      'profile-image-3.jpg',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  profileImageName: string[];

  @ApiProperty({
    description: '프로필 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  profileId: string;
}
