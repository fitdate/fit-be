import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from 'src/common/enum/user-role.enum';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    role: UserRole;
    type: 'access' | 'refresh';
  };
}

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request || !request.user || !request.user.sub) {
      throw new UnauthorizedException('사용자 정보를 찾을 수 없습니다.');
    }
    return request.user.sub;
  },
);
