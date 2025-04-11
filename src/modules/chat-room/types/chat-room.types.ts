export interface JoinRoomData {
  roomId: string;
  userId: string;
}

export interface TypingData {
  roomId: string;
  userId: string;
}

export interface Response<T> {
  success: boolean;
  data?: T;
  error?: string;
}
