import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FindOrCreateChatRoomDto {
  @ApiProperty({
    description: '채팅방 상대방 사용자 ID',
    example: 'partner-uuid',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  partnerId: string;
}
