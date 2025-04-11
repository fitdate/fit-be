import { UserRole } from 'src/common/enum/user-role.enum';
import { Request } from 'express';

export interface RequestWithUser extends Request {
  user?: {
    role: UserRole;
    [key: string]: any;
  };
}
