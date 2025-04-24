import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { NotificationType } from 'src/common/enum/notification.enum';

export class CreateNotificationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsUUID()
  receiverId: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
