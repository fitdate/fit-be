import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { UserRole } from 'src/common/enum/user-role.enum';

export const OPTIONAL_KEY = 'isOptional';

interface RequestWithUser extends Request {
  user?: {
    sub: string;
    role: UserRole;
    type: 'access' | 'refresh';
  };
}

export const OptionalUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    // request.user 전체 로그
    // eslint-disable-next-line no-console
    console.log('[OptionalUserId] request.user:', request.user);
    const sub = request.user?.sub ?? undefined;
    // eslint-disable-next-line no-console
    console.log('[OptionalUserId] 추출된 sub:', sub);
    return sub;
  },
);

export const Optional = () => SetMetadata(OPTIONAL_KEY, true);
