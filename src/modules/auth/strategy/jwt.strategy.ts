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
  const logger = new Logger('CookieExtractor');
  logger.debug(`Headers: ${JSON.stringify(req?.headers || {})}`);
  logger.debug(`Cookies object: ${JSON.stringify(req?.cookies || {})}`);

  // 1. req.cookies에서 먼저 시도
  if (req?.cookies?.accessToken) {
    logger.debug(`Found token in req.cookies: ${req.cookies.accessToken}`);
    return req.cookies.accessToken;
  }

  // 2. req.headers.cookie에서 시도
  const cookieHeader = req?.headers?.cookie;
  logger.debug(`Cookie header: ${cookieHeader}`);

  if (cookieHeader) {
    try {
      // 모든 쿠키 파싱
      const cookiePairs = cookieHeader.split(';');
      logger.debug(`Cookie pairs: ${JSON.stringify(cookiePairs)}`);

      for (const pair of cookiePairs) {
        const [key, value] = pair.trim().split('=');
        logger.debug(`Checking cookie: ${key}=${value}`);

        if (key === 'accessToken') {
          logger.debug(`Found access token in headers: ${value}`);
          return value;
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error parsing cookies: ${errorMessage}`);
    }
  }

  logger.error('No access token found in request');
  throw new UnauthorizedException('액세스 토큰이 없습니다');
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
      passReqToCallback: true,
    });
  }

  async validate(req: RequestWithCookies, payload: TokenPayload) {
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
      token:
        req.cookies?.accessToken ||
        req.headers?.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('accessToken='))
          ?.split('=')[1],
    };
  }
}
