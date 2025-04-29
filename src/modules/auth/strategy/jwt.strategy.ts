import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { TokenPayload } from '../types/token-payload.types';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from '../../user/user.service';
import { AllConfig } from 'src/common/config/config.types';

interface RequestWithCookies extends Request {
  cookies: {
    accessToken?: string;
    refreshToken?: string;
    [key: string]: string | undefined;
  };
}

const cookieExtractor = (req: RequestWithCookies) => {
  if (!req?.cookies?.accessToken) {
    throw new UnauthorizedException('액세스 토큰이 없습니다');
  }
  return req.cookies.accessToken;
};

export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('jwt.accessTokenSecret', {
        infer: true,
      }),
    });
  }

  async validate(payload: TokenPayload, req: RequestWithCookies) {
    this.logger.debug(`Validating token payload: ${JSON.stringify(payload)}`);

    if (payload.type !== 'access') {
      this.logger.error(`Invalid token type: ${payload.type}`);
      throw new UnauthorizedException('잘못된 토큰 타입입니다');
    }

    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      this.logger.error(`User not found for ID: ${payload.sub}`);
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }

    this.logger.debug(`User validated successfully: ${user.id}`);

    return {
      ...payload,
      sub: payload.sub,
      user: user,
      token: cookieExtractor(req),
    };
  }
}
