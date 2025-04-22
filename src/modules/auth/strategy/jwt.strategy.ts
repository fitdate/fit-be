import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { TokenPayload } from '../types/token-payload.types';
import { Request } from 'express';

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
  constructor(private configService: ConfigService<AllConfig>) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('jwt.accessTokenSecret', {
        infer: true,
      }),
    });
  }

  validate(payload: TokenPayload) {
    return payload;
  }
}
