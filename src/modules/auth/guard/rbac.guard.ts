import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBAC } from '../decorator/rbac.decorator';
import { UserRole } from 'src/common/enum/user-role.enum';
import { Observable } from 'rxjs';
import { RequestWithUser } from '../types/rbac-guard.types';

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRole = this.reflector.get<UserRole>(
      RBAC,
      context.getHandler(),
    );

    if (requiredRole === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return false;
    }

    return user.role <= requiredRole;
  }
}
