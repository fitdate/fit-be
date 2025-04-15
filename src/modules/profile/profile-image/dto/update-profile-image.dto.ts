import { PartialType } from '@nestjs/mapped-types';
import { CreateProfileImageDto } from './create-profile-image.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileImageDto extends PartialType(CreateProfileImageDto) {
  @ApiProperty({
    description: 'Profile image name',
    example: 'new-profile.jpg',
    required: false,
  })
  profileImageName?: string;
}
