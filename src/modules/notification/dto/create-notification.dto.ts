import { IsString, IsNumber, IsEnum } from 'class-validator';

export enum NotificationType {
  MATCH = 'MATCH',
  LIKE = 'LIKE',
}

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsNumber()
  receiverId: number;
}
