import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from '../../../common/decorator/public.decorator';
import { OPTIONAL_KEY } from '../../../common/decorator/optional-user.decorator';

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

    const req: { cookies?: unknown; headers?: unknown; user?: unknown } =
      context.switchToHttp().getRequest();
    this.logger.debug(`Request cookies: ${JSON.stringify(req.cookies)}`);
    this.logger.debug(`Request headers: ${JSON.stringify(req.headers)}`);
    this.logger.debug(`Request user(초기): ${JSON.stringify(req.user)}`);

    if (isPublic || isOptional) {
      this.logger.debug('Optional/Public이므로 인증을 건너뜁니다.');
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context?: ExecutionContext,
    status?: any,
  ): TUser {
    this.logger.debug(`Auth error: ${String(err)}`);
    this.logger.debug(`Auth user(최종): ${String(user)}`);
    this.logger.debug(`Auth info: ${String(info)}`);

    if (err) {
      this.logger.error(`Authentication failed: ${String(err)}`);
      throw err;
    }

    return user;
  }
}
