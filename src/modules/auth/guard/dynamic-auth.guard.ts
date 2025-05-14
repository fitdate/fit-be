import {
  Injectable,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

interface SocialRequest extends Request {
  authProvider?: string;
}

@Injectable()
export class DynamicAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(DynamicAuthGuard.name);

  constructor() {
    super();
  }

  // provider를 동적으로 추출하여 해당 전략으로 인증
  getRequest(context: ExecutionContext): SocialRequest {
    const request = context.switchToHttp().getRequest<SocialRequest>();
    const provider = request.params.provider;
    if (!provider || !['google', 'kakao', 'naver'].includes(provider)) {
      this.logger.error(`[소셜 인증] 지원하지 않는 provider: ${provider}`);
      throw new UnauthorizedException('지원하지 않는 소셜 로그인입니다.');
    }
    // provider를 request에 저장하여 validate에서 활용 가능
    request.authProvider = provider;
    return request;
  }

  // Passport가 사용할 전략 이름을 동적으로 반환
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const provider = request.params.provider;
    this.logger.debug(`[소셜 인증] provider: ${provider}`);
    return { session: false, strategy: provider };
  }
}
