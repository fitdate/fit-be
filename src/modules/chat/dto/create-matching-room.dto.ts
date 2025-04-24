import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateMatchingRoomDto {
  @ApiProperty({
    description: '첫 번째 사용자의 ID',
    example: 'user1-uuid',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  user1Id: string;

  @ApiProperty({
    description: '두 번째 사용자의 ID',
    example: 'user2-uuid',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  user2Id: string;
}
