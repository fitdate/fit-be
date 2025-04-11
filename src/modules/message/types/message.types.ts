export interface SendMessageData {
  roomId: string;
  senderId: string;
  content: string;
  type?: 'text' | 'image' | 'emoji';
  fileUrl?: string;
}

export interface MessageReadData {
  messageId: string;
  userId: string;
}

export interface SearchMessageData {
  roomId: string;
  keyword: string;
  cursor?: string;
  limit?: number;
}

export interface MessageHistoryData {
  roomId: string;
  before?: string; // 특정 메시지 ID 이전의 메시지들
  after?: string; // 특정 메시지 ID 이후의 메시지들
  limit?: number;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'emoji';
  fileUrl?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
