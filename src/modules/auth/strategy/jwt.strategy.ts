import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

import { AllConfig } from 'src/common/config/config.types';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/modules/user/user.service';
import { TokenPayload } from '../types/token-payload.types';

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
          this.logger.debug(
            `Extracting token from cookies: ${JSON.stringify(request.cookies)}`,
          );
          return request?.cookies?.accessToken;
        },
        // Bearer 토큰에서 추출
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate(payload: TokenPayload): Promise<unknown> {
    this.logger.debug(`Validating payload: ${JSON.stringify(payload)}`);
    const { sub } = payload;
    this.logger.debug(`Looking up user by ID: ${sub}`);
    const user = await this.userService.findOne(sub);
    this.logger.debug(`Found user: ${JSON.stringify(user)}`);
    
    if (!user) {
      this.logger.error(`User not found for ID: ${sub}`);
      throw new UnauthorizedException('User not found');
    }

    const { ...rest } = user;
    return rest;
  }
}
