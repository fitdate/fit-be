import { UserRole } from 'src/common/enum/user-role.enum';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  type: 'access' | 'refresh';
  tokenId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenMetadata {
  ip: string;
  userAgent: string;
}
