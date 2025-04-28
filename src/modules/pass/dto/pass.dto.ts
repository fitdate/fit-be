import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PassDto {
  @ApiProperty({
    description: '거절할 사용자의 ID',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  passedUserId: string;
}
