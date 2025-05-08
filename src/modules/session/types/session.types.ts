export interface Session {
  sessionId: string;
  userId: string;
  tokenId: string;
  isActive: boolean;
  lastActive: Date;
  createdAt: Date;
  deviceId: string;
  deviceType: string;
  browser: string;
  os: string;
  ip: string;
  userAgent: string;
}
