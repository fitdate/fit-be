import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

import { AllConfig } from 'src/common/config/config.types';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/modules/user/user.service';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private userService: UserService,
    private configService: ConfigService<AllConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 쿠키에서 토큰 추출
        (request: Request) => {
          return request?.cookies?.Authentication;
        },
        // Bearer 토큰에서 추출
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: this.configService.getOrThrow('jwt.accessTokenSecret', {
        infer: true,
      }),
    });
  }

  async validate(payload: any): Promise<unknown> {
    const { sub } = payload;
    const user = await this.userService.findUserByEmail(sub);
    const { password, ...rest } = user;
    return rest;
  }
}
