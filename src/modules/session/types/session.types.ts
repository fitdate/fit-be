export interface Session {
  sessionId: string;
  userId: string;
  tokenId: string;
  isActive: boolean;
  lastActive: Date;
  createdAt: Date;
  ip: string;
  userAgent: string;
}

export interface SocketMetadata {
  userId: string;
}

export interface JwtPayload {
  sub: string;
}
