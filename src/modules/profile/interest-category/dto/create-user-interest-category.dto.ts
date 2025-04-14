import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class CreateUserInterestCategoryDto {
  @ApiProperty({
    description: '프로필 ID',
    example: 'UUID',
  })
  @IsUUID('4')
  profileId: string;

  @ApiProperty({
    description: '관심사 카테고리 ID 목록',
    example: ['UUID', 'UUID', 'UUID'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  interestCategoryIds: string[];
}
