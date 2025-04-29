import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { TokenPayload } from '../types/token-payload.types';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from '../../user/user.service';
import { RedisService } from '../../redis/redis.service';

interface RequestWithCookies extends Request {
  cookies: {
    accessToken?: string;
    refreshToken?: string;
    [key: string]: string | undefined;
  };
}

const cookieExtractor = (req: RequestWithCookies) => {
  try {
    if (!req) {
      throw new UnauthorizedException('Request 객체를 찾을 수 없습니다');
    }

    // 쿠키 파싱 디버깅
    console.log('Raw cookies:', req.cookies);
    console.log('Raw headers:', req.headers);

    // req.cookies에서 토큰 찾기
    const token = req.cookies?.accessToken;
    if (token) {
      return token;
    }

    // 헤더에서 쿠키 파싱 시도
    const cookieHeader = req.headers?.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce(
        (acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        },
        {} as Record<string, string>,
      );

      if (cookies.accessToken) {
        return cookies.accessToken;
      }
    }

    throw new UnauthorizedException('액세스 토큰이 없습니다');
  } catch (error) {
    console.error('Cookie extraction failed:', error);
    throw error;
  }
};

export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {
    const secretOrKey = configService.get<string>('jwt.accessTokenSecret');
    if (!secretOrKey) {
      throw new Error('JWT secret key is not configured');
    }

    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate(payload: TokenPayload, req: RequestWithCookies) {
    try {
      if (!req) {
        this.logger.error('Request object is undefined');
        throw new UnauthorizedException('Request 객체를 찾을 수 없습니다');
      }

      const token = cookieExtractor(req);
      this.logger.debug('Extracted token:', token);

      if (payload.type !== 'access') {
        throw new UnauthorizedException('잘못된 토큰 타입입니다');
      }

      const isValid = await this.redisService.isAccessTokenValid(token);
      if (!isValid) {
        throw new UnauthorizedException('토큰이 만료되었습니다');
      }

      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다');
      }

      return {
        ...payload,
        user,
        token,
      };
    } catch (error) {
      this.logger.error('Token validation failed:', error);
      throw error;
    }
  }
}
