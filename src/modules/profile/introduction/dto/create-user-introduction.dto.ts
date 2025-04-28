import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

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

  @ApiProperty({
    description: '소개 이름 목록',
    example: ['소개 이름 1', '소개 이름 2', '소개 이름 3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  introductionNames: string[];
}
