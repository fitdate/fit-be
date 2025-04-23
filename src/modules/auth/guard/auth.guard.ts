import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from '../../../common/decorator/public.decorator';

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

    this.logger.debug(`Route is public: ${isPublic}`);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    this.logger.debug(`Request cookies: ${JSON.stringify(request.cookies)}`);
    this.logger.debug(`Request headers: ${JSON.stringify(request.headers)}`);

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.debug(`Auth error: ${err}`);
    this.logger.debug(`Auth user: ${JSON.stringify(user)}`);
    this.logger.debug(`Auth info: ${info}`);

    if (err || !user) {
      this.logger.error(`Authentication failed: ${err || 'No user'}`);
      throw err || new Error('No user');
    }
    return user;
  }
}
