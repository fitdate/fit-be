import { ApiProperty } from '@nestjs/swagger';
import { BaseTable } from 'src/common/entity/base-table.entity';

export class MessageResponseDto extends BaseTable {
  @ApiProperty({
    description: '메시지 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '메시지 내용',
    example: '안녕하세요!',
  })
  content: string;

  @ApiProperty({
    description: '보내는 사람 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  senderId: string;

  @ApiProperty({
    description: '메시지 타입',
    example: 'text',
    enum: ['text', 'image', 'emoji'],
  })
  type: 'text' | 'image' | 'emoji';

  @ApiProperty({
    description: '파일 URL',
    example: 'https://example.com/image.jpg',
    required: false,
  })
  fileUrl?: string;

  @ApiProperty({
    description: '읽음 여부',
    example: false,
  })
  isRead: boolean;

  @ApiProperty({
    description: '채팅방 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  chatRoomId: string;

  @ApiProperty({
    description: '내가 보낸 메시지인지 여부',
    example: true,
  })
  isMine: boolean;
}
