import { ApiProperty } from '@nestjs/swagger';

export class MatchResultUserDto {
  @ApiProperty({
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: '닉네임', example: '홍길동' })
  nickname: string;

  @ApiProperty({ description: '좋아요 수', example: 10 })
  likeCount: number;

  @ApiProperty({ description: '나이', example: 25 })
  age: number;

  @ApiProperty({ description: '지역', example: '서울' })
  region: string;

  @ApiProperty({
    description: '프로필 이미지 URL',
    example: 'https://example.com/profile.jpg',
  })
  profileImage: string;
}

export class MatchResultResponseDto {
  @ApiProperty({ type: MatchResultUserDto })
  currentUser: MatchResultUserDto;

  @ApiProperty({ type: MatchResultUserDto })
  selectedUser: MatchResultUserDto;
}
