import {
  Injectable,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from '../../../common/decorator/public.decorator';
import { OPTIONAL_KEY } from '../../../common/decorator/optional-user.decorator';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean {
    if (this.shouldBypassAuth(context)) {
      this.logger.debug('인증 우회: public 또는 optional-user 데코레이터 감지');
      return true;
    }
    this.logRequestInfo(context);
    return super.canActivate(context) as boolean;
  }

  handleRequest<TUser = any>(
    err: Error | null,
    user: TUser,
    info: { message: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    if (err) {
      this.logger.error(`[인증 실패] 예외 발생: ${err.message}`);
      throw err;
    }
    if (!user && !this.isOptional(context)) {
      const reason = info?.message || '사용자 정보 없음';
      this.logger.error(`[인증 실패] ${reason}`);
      throw new UnauthorizedException('인증이 필요합니다');
    }
    this.logger.debug(`[인증 성공] 사용자 정보: ${JSON.stringify(user)}`);
    return user;
  }

  private shouldBypassAuth(context: ExecutionContext): boolean {
    return this.isPublic(context) || this.isOptional(context);
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  private isOptional(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(OPTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  private logRequestInfo(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest<Request>();
    this.logger.debug(`요청 쿠키: ${JSON.stringify(request.cookies)}`);
    this.logger.debug(`요청 헤더: ${JSON.stringify(request.headers)}`);
  }
}
