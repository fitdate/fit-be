import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { NotificationType } from 'src/common/enum/notification.enum';
import { ApiProperty } from '@nestjs/swagger';
export class CreateNotificationDto {
  @ApiProperty({
    description: '알림 제목',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: '알림 내용',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: '알림 타입',
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: '알림 받는 사람의 ID',
  })
  @IsUUID()
  receiverId: string;

  @ApiProperty({
    description: '알림 데이터',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
