import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateMatchingRoomDto {
  @ApiProperty({
    description: '현재 로그인한 사용자의 ID',
    example: 'user-uuid',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: '매칭된 상대방의 ID',
    example: 'partner-uuid',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  partnerId: string;
}
