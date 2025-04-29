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

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isOptional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.debug(`Route is public: ${isPublic}`);
    this.logger.debug(`Route is optional: ${isOptional}`);

    if (isPublic || isOptional) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    this.logger.debug(`Request cookies: ${JSON.stringify(request.cookies)}`);
    this.logger.debug(`Request headers: ${JSON.stringify(request.headers)}`);

    return super.canActivate(context);
  }

  handleRequest(
    err: Error | null,
    user: any,
    info: { message: string } | undefined,
    context: ExecutionContext,
  ): any {
    this.logger.debug(`[인증 처리] 오류: ${err?.message || '없음'}`);
    this.logger.debug(
      `[인증 처리] 사용자 정보: ${JSON.stringify(user) || '없음'}`,
    );
    this.logger.debug(`[인증 처리] 추가 정보: ${info?.message || '없음'}`);

    if (err) {
      this.logger.error(`[인증 실패] 상세 오류: ${err.message}`);
      throw err;
    }

    if (!user && !this.reflector.get(OPTIONAL_KEY, context.getHandler())) {
      this.logger.error('[인증 실패] 사용자 정보가 없습니다');
      throw new UnauthorizedException('인증이 필요합니다');
    }

    return user;
  }
}
