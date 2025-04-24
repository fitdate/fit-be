import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FindOrCreateChatRoomDto {
  @ApiProperty({
    description: '상대방 사용자 ID',
    example: 'user-uuid',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  opponentId: string;
}
