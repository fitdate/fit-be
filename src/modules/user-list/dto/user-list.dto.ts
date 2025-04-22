import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
export class CreateUserListDto {
  @ApiProperty({
    description: '최대 거리',
    example: 100,
  })
  @IsNumber()
  maxDistance: number;

  @ApiProperty({
    description: '최소 나이',
    example: 20,
  })
  @IsNumber()
  minAge: number;

  @ApiProperty({
    description: '최대 나이',
    example: 30,
  })
  @IsNumber()
  maxAge: number;

  @ApiProperty({
    description: '최소 좋아요 수',
    example: 10,
  })
  @IsNumber()
  minLikeCount: number;
}
