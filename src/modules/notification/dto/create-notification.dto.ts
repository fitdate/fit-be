import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';

export enum NotificationType {
  MATCH = 'MATCH',
  LIKE = 'LIKE',
  COFFEE_CHAT = 'COFFEE_CHAT',
  CHAT = 'CHAT',
}

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
