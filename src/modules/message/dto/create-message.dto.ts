import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({
    description: '채팅방 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  chatRoomId: string;

  @ApiProperty({
    description: '보내는 사람 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: '메시지 내용', example: '안녕하세요!' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
