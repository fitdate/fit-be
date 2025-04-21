import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteProfileImageDto {
  @ApiProperty({
    description: '삭제할 프로필 이미지 ID 목록',
    example: ['uuid1', 'uuid2'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];
}
