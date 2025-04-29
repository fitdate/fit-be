import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { TokenPayload } from '../types/token-payload.types';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from '../../user/user.service';
import { RedisService } from '../../redis/redis.service';

const cookieExtractor = (req: Request) => {
  if (!req || !req.cookies) {
    throw new UnauthorizedException('쿠키를 찾을 수 없습니다');
  }

  const token = req.cookies.accessToken as string;
  if (!token) {
    throw new UnauthorizedException('액세스 토큰이 없습니다');
  }
  return token;
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

  async validate(payload: TokenPayload, req: Request) {
    const token = cookieExtractor(req);

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
      token, // 현재 토큰을 interceptor에서 활용할 수 있도록 함께 전달
    };
  }
}
