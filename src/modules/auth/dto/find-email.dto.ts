import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class FindEmailDto {
  @ApiProperty({
    description: '이름',
    example: '홍길동',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '전화번호',
    example: '010-1234-5678',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
