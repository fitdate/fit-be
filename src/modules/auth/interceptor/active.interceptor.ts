import { Injectable, Logger } from '@nestjs/common';
import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';
import { Request, Response } from 'express';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    token: string;
  };
}

interface ResponseWithCookie extends Response {
  cookie(name: string, value: string, options?: any): this;
}

@Injectable()
export class ActiveInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActiveInterceptor.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<ResponseWithCookie>();
    const user = request.user;

    if (!user?.sub || !user?.token) {
      return next.handle(); // 인증 정보 없음
    }

    const isValid = await this.redisService.isAccessTokenValid(user.token);
    if (!isValid) {
      const newAccessToken = await this.jwtService.signAsync(
        { sub: user.sub, type: 'access' },
        { expiresIn: '5m' },
      );

      await this.redisService.saveAccessToken(newAccessToken, user.sub);

      if (response?.cookie) {
        response.cookie('accessToken', newAccessToken, { httpOnly: true });
        this.logger.debug(`New access token issued for user ${user.sub}`);
      }
    }

    return next.handle();
  }
}
