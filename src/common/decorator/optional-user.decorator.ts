import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
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
    return request.user?.sub ?? undefined;
  },
);

export const Optional = () => SetMetadata(OPTIONAL_KEY, true);
