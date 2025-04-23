import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

import { AllConfig } from 'src/common/config/config.types';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/modules/user/user.service';

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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private userService: UserService,
    private configService: ConfigService<AllConfig>,
  ) {
    const secretOrKey = configService.getOrThrow('jwt.accessTokenSecret', {
      infer: true,
    });

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 쿠키에서 토큰 추출
        (request: Request) => {
          this.logger.debug(`Extracting token from cookies: ${JSON.stringify(request.cookies)}`);
          return request?.cookies?.Authentication;
        },
        // Bearer 토큰에서 추출
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate(payload: any): Promise<unknown> {
    this.logger.debug(`Validating payload: ${JSON.stringify(payload)}`);
    const { sub } = payload;
    const user = await this.userService.findUserByEmail(sub);
    this.logger.debug(`Found user: ${JSON.stringify(user)}`);
    
    if (!user) {
      this.logger.error(`User not found for sub: ${sub}`);
      throw new UnauthorizedException('User not found');
    }

    const { ...rest } = user;
    return rest;
  }
}
