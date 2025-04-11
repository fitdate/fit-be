import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/common/enum/user-role.enum';

export const RBAC = Reflector.createDecorator<UserRole[]>();
