export interface Session {
  userId: string;
  deviceId: string;
  tokenId: string;
  isActive: boolean;
  lastActive: Date;
}
