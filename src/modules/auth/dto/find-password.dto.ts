import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class FindPasswordDto {
  @ApiProperty({
    description: '이메일',
    example: 'test@example.com',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '이름',
    example: '홍길동',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '전화번호',
    example: '010-1234-5678',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
