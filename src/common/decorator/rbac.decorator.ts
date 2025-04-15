import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/common/enum/user-role.enum';

export const RBAC_KEY = 'rbac';
export const RBAC = (...roles: UserRole[]) => SetMetadata(RBAC_KEY, roles);
