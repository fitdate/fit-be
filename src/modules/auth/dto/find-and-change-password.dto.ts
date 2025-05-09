import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FindAndChangePasswordDto {
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
