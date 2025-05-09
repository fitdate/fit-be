import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class FindAndChangePasswordDto {
  @ApiProperty({
    description: '유저 id',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: '새 비밀번호',
    example: 'newPassword123!',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  newPassword: string;

  @ApiProperty({
    description: '새 비밀번호 확인',
    example: 'newPassword123!',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}
