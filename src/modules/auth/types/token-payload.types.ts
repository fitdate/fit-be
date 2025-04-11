import { JwtPayload } from 'jsonwebtoken';
import { UserRole } from 'src/common/enum/user-role.enum';

export interface TokenPayload extends JwtPayload {
  id: number;
  role: UserRole;
  type: 'access' | 'refresh';
}
