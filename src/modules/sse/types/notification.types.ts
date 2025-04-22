export interface NotificationDto {
  message: string;
  timestamp: Date;
  type: NotificationType;
  data?: Record<string, any>;
}

export enum NotificationType {
  CHAT = 'chat',
  MATCHING = 'matching',
  SYSTEM = 'system',
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
}
