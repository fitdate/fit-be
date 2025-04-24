import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from 'src/common/enum/notification.enum';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsDate,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class NotificationResponseDto {
  @ApiProperty({ description: '알림 ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: '알림 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '알림 내용' })
  @IsString()
  content: string;

  @ApiProperty({ description: '알림 타입', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: '읽음 여부' })
  @IsBoolean()
  isRead: boolean;

  @ApiProperty({ description: '생성일시' })
  @IsDate()
  @Type(() => Date)
  @Transform(({ value }: { value: Date }) => {
    const date = new Date(value);
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    const hour12 = hours % 12 || 12;

    return `${year}.${month}.${day}. ${ampm} ${hour12}:${minutes}`;
  })
  createdAt: string;

  @ApiProperty({ description: '추가 데이터', required: false })
  @IsOptional()
  @IsString()
  data?: Record<string, any>;
}
