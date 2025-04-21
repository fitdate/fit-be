import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { TokenPayload } from '../types/token-payload.types';
import { Request } from 'express';

const cookieExtractor = (req: Request) => {
  let token: string | null = null;
  if (req && req.cookies) {
    token = req.cookies.accessToken as string;
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
