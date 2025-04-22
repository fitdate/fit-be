import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { NotificationType } from '../../../common/enum/notification.enum';

export class CreateNotificationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsNumber()
  receiverId: number;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
