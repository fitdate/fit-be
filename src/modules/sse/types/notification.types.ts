import { NotificationType } from '../../../common/enum/notification.enum';

export interface Notification {
  type: NotificationType;
  title?: string;
  content?: string;
  data?: Record<string, any>;
}
