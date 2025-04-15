import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateProfileDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Profile introduction',
    example: '안녕하세요!',
    required: false,
  })
  @IsString()
  @IsOptional()
  intro?: string;

  @ApiProperty({
    description: 'Profile image URLs',
    example: ['image1.jpg', 'image2.jpg'],
    required: false,
  })
  @IsOptional()
  profileImageUrls?: string[];

  @ApiProperty({
    description: 'Job',
    example: '개발자',
    required: false,
  })
  @IsString()
  @IsOptional()
  job?: string;
}
