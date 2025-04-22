import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateProfileImageDto {
  @ApiProperty({
    description: '이미지 URL',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  url: string;
}
