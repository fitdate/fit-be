import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
export class InterestCategoryResponseDto {
  @ApiProperty({
    example: 'uuid',
    description: '관심사 카테고리 ID',
  })
  @IsUUID('4')
  id: string;

  @ApiProperty({
    example: '스포츠',
    description: '관심사 카테고리 이름',
  })
  name: string;

  @ApiProperty({
    example: '스포츠 관련 활동들',
    description: '관심사 카테고리 설명',
    required: false,
  })
  description?: string;
}
