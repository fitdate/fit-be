import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class CreateUserInterestCategoryDto {
  @ApiProperty({
    description: '프로필 ID',
    example: 'UUID',
  })
  @IsUUID('4')
  profileId: string;

  @ApiProperty({
    description: '관심사 카테고리 이름 목록',
    example: ['Sports', 'Music', 'Art'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  interestCategoryNames: string[];
}
