import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { TokenPayload } from '../types/token-payload.types';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from '../../user/user.service';

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
    private configService: ConfigService<AllConfig>,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('jwt.accessTokenSecret', {
        infer: true,
      }),
    });
  }

  async validate(payload: TokenPayload) {
    this.logger.debug(`Validating token payload: ${JSON.stringify(payload)}`);

    // 토큰 타입 검증
    if (payload.type !== 'access') {
      this.logger.error(`Invalid token type: ${payload.type}`);
      throw new UnauthorizedException('잘못된 토큰 타입입니다');
    }

    // 사용자 존재 여부 확인
    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      this.logger.error(`User not found for ID: ${payload.sub}`);
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }

    this.logger.debug(`User validated successfully: ${user.id}`);

    // payload의 sub를 유지하면서 사용자 정보를 추가
    return {
      ...payload,
      sub: payload.sub,
      user: user,
    };
  }
}
