import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';

interface TokenPayload {
  type: 'access' | 'refresh';
  sub: string;
  iat: number;
  exp: number;
}

interface RequestWithAuth extends Request {
  user?: TokenPayload;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfig>,
  ) {}

  async use(req: RequestWithAuth, res: Response, next: NextFunction) {
    try {
      const token = this.extractToken(req);
      if (!token) {
        next();
        return;
      }

      const payload = await this.validateToken(token);
      req.user = payload;
      next();
    } catch (error) {
      next(error);
    }
  }

  private extractToken(req: Request): string | null {
    const cookies = req.cookies as { accessToken?: string } | undefined;
    if (!cookies?.accessToken) {
      throw new UnauthorizedException('액세스 토큰이 없습니다');
    }
    return cookies.accessToken;
  }

  private async validateToken(token: string): Promise<TokenPayload> {
    try {
      const decodedPayload = this.jwtService.decode<TokenPayload>(token);

      if (
        !decodedPayload ||
        typeof decodedPayload !== 'object' ||
        !('type' in decodedPayload)
      ) {
        throw new UnauthorizedException('유효하지 않은 토큰 형식입니다');
      }

      if (!['access', 'refresh'].includes(decodedPayload.type)) {
        throw new UnauthorizedException('지원하지 않는 토큰 타입입니다');
      }

      const secretKey = this.configService.getOrThrow(
        decodedPayload.type === 'refresh'
          ? 'jwt.refreshTokenSecret'
          : 'jwt.accessTokenSecret',
        { infer: true },
      );

      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: secretKey,
      });

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('토큰이 만료되었습니다');
      }

      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }
  }
}
