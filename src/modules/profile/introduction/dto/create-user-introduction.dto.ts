import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class CreateUserIntroductionDto {
  @ApiProperty({
    description: '소개 ID 목록',
    example: ['UUID', 'UUID', 'UUID'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  introductionIds: string[];

  @ApiProperty({
    description: '프로필 ID',
    example: 'UUID',
  })
  @IsUUID('4')
  profileId: string;
}
