import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Response } from 'express';
import { AllConfig } from 'src/common/config/config.types';
import {
  JwtPayload,
  RequestWithAuth,
  TOKEN_ERROR_TYPES,
} from '../types/auth-guard.types';

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfig>,
  ) {}

  async use(req: RequestWithAuth, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      next();
      return;
    }

    try {
      const token = this.validateBearerToken(authHeader);
      const decodedPayload = this.jwtService.decode<JwtPayload>(token);

      if (
        !decodedPayload ||
        typeof decodedPayload !== 'object' ||
        !('type' in decodedPayload)
      ) {
        next(
          new UnauthorizedException({
            message: '유효하지 않은 토큰 형식입니다',
            code: TOKEN_ERROR_TYPES.FORMAT_ERROR,
          }),
        );
        return;
      }

      if (
        decodedPayload.type !== 'refresh' &&
        decodedPayload.type !== 'access'
      ) {
        next(
          new UnauthorizedException({
            message: '지원하지 않는 토큰 타입입니다',
            code: TOKEN_ERROR_TYPES.TYPE_ERROR,
          }),
        );
        return;
      }

      const secretKey = this.configService.getOrThrow(
        decodedPayload.type === 'refresh'
          ? 'jwt.refreshTokenSecret'
          : 'jwt.accessTokenSecret',
        {
          infer: true,
        },
      );

      if (!secretKey) {
        throw new Error('JWT secret key not found');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: secretKey,
      });

      req.user = payload;
      next();
    } catch (error) {
      const err = error as Error;

      if (err instanceof UnauthorizedException) {
        next(err);
        return;
      }

      if (err.name === 'TokenExpiredError') {
        next(
          new UnauthorizedException({
            message: '토큰이 만료되었습니다',
            code: TOKEN_ERROR_TYPES.EXPIRED,
          }),
        );
      } else if (err.name === 'JsonWebTokenError') {
        next(
          new UnauthorizedException({
            message: `유효하지 않은 토큰: ${err.message}`,
            code: TOKEN_ERROR_TYPES.INVALID,
          }),
        );
      } else {
        next(
          new UnauthorizedException({
            message: '토큰 검증 중 오류가 발생했습니다',
            code: TOKEN_ERROR_TYPES.INVALID,
          }),
        );
      }
    }
  }

  private validateBearerToken(rawToken: string): string {
    const bearerSplit = rawToken.split(' ');
    if (bearerSplit.length !== 2) {
      throw new BadRequestException('토큰 포맷이 잘못되었습니다');
    }

    const [bearer, token] = bearerSplit;
    if (bearer.toLowerCase() !== 'bearer') {
      throw new BadRequestException('토큰 포맷이 잘못되었습니다');
    }

    return token;
  }
}
