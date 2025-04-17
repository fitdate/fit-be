import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

export const SKIP_PROFILE_COMPLETE = 'skipProfileComplete';
export const SkipProfileComplete = () =>
  SetMetadata(SKIP_PROFILE_COMPLETE, true);

interface RequestUser {
  id: string;
  email: string;
  isProfileComplete?: boolean;
  [key: string]: any;
}

@Injectable()
export class ProfileCompleteGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 데코레이터 확인
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_PROFILE_COMPLETE,
      [context.getHandler(), context.getClass()],
    );

    // 데코레이터가 있으면 체크 건너뜀
    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser;

    if (!user) {
      throw new UnauthorizedException('사용자 정보를 찾을 수 없습니다.');
    }

    if (!user.isProfileComplete) {
      throw new UnauthorizedException('프로필을 완성해야 접근할 수 있습니다.');
    }

    return true;
  }
}
