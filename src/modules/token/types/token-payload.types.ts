import { JwtPayload } from 'jsonwebtoken';
import { UserRole } from 'src/common/enum/user-role.enum';

export interface TokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  type: 'access' | 'refresh';
  tokenId: string;
  sessionId: string;
}

export interface TokenMetadata {
  ip: string;
  userAgent: string;
  sessionId: string;
}
