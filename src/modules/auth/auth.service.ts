import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { HashService } from './hash/hash.service';
import { JwtService } from '@nestjs/jwt';
import { AllConfig } from 'src/common/config/config.types';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/common/enum/user-role.enum';
import { RegisterDto } from './dto/register.dto';
import { TokenPayload } from './types/token-payload.types';
import { EmailLoginDto } from './dto/email-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly hashService: HashService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly jwtService: JwtService,
  ) {}

  parseBasicToken(rawToken: string) {
    const basicToken = rawToken.split(' ')[1];
    if (basicToken.length !== 2) {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

    const [basic, token] = basicToken;

    if (basic.toLocaleLowerCase() !== 'basic') {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

    const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
    const tokenSplit = decodedToken.split(':');

    if (tokenSplit.length !== 2) {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

    const [email, password] = tokenSplit;

    return { email, password };
  }

  async parseBearerToken(
    rawToken: string,
    isRefreshToken: boolean,
  ): Promise<TokenPayload> {
    const bearerToken = rawToken.split(' ')[1];
    if (!bearerToken) {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

    const [bearer, token] = bearerToken.split(' ');

    if (bearer.toLocaleLowerCase() !== 'bearer') {
      throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.configService.getOrThrow(
          isRefreshToken ? 'jwt.refreshTokenSecret' : 'jwt.accessTokenSecret',
          {
            infer: true,
          },
        ),
      });
      if (isRefreshToken && payload.type !== 'refresh') {
        throw new UnauthorizedException('리프레시 토큰이 아닙니다.');
      }

      if (!isRefreshToken && payload.type !== 'access') {
        throw new UnauthorizedException('엑세스 토큰이 아닙니다.');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('토큰이 만료되었거나 잘못되었습니다.', {
        cause: error,
      });
    }
  }

  async register(registerDto: RegisterDto) {
    const {
      email,
      password,
      nickname,
      name,
      birthday,
      gender,
      phoneNumber,
      address,
    } = registerDto;

    const userEmail = await this.userService.findUserByEmail(email);
    if (userEmail) {
      throw new UnauthorizedException('이미 존재하는 이메일입니다.');
    }

    const userNickname = await this.userService.findUserByNickname(nickname);
    if (userNickname) {
      throw new UnauthorizedException('이미 존재하는 닉네임입니다.');
    }

    const hashedPassword = await this.hashService.hash(password);
    const user = await this.userService.createUser({
      email,
      password: hashedPassword,
      nickname,
      name,
      birthday,
      gender,
      phoneNumber,
      address,
    });

    return user;
  }

  async validate(email: string, password: string) {
    const user = await this.userService.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('존재하지 않는 이메일입니다.');
    }

    const isPasswordValid = await this.hashService.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    return user;
  }

  async login(loginDto: EmailLoginDto): Promise<{
    refreshToken: string;
    accessToken: string;
  }> {
    const { email, password } = loginDto;

    const user = await this.validate(email, password);

    const refreshToken = this.issueToken(user.id, user.role, true);
    const accessToken = this.issueToken(user.id, user.role, false);

    return {
      refreshToken,
      accessToken,
    };
  }

  issueToken(userId: number, userRole: UserRole, isRefreshToken: boolean) {
    const accessTokenSecret = this.configService.getOrThrow(
      'jwt.accessTokenSecret',
      {
        infer: true,
      },
    );

    const refreshTokenSecret = this.configService.getOrThrow(
      'jwt.refreshTokenSecret',
      {
        infer: true,
      },
    );

    const accessTokenExpiresIn = this.configService.getOrThrow(
      'jwt.accessTokenTtl',
      {
        infer: true,
      },
    );

    const refreshTokenExpiresIn = this.configService.getOrThrow(
      'jwt.refreshTokenTtl',
      {
        infer: true,
      },
    );

    const tokenType = isRefreshToken ? 'refresh' : 'access';

    const audience = this.configService.getOrThrow('jwt.audience', {
      infer: true,
    });

    const issuer = this.configService.getOrThrow('jwt.issuer', {
      infer: true,
    });

    const tokenSecret = isRefreshToken ? refreshTokenSecret : accessTokenSecret;

    const tokenTtl = isRefreshToken
      ? refreshTokenExpiresIn
      : accessTokenExpiresIn;

    const token = this.jwtService.sign(
      {
        id: userId,
        role: userRole,
        type: tokenType,
      },
      {
        secret: tokenSecret,
        expiresIn: tokenTtl,
        audience,
        issuer,
      },
    );
    return token;
  }
}
