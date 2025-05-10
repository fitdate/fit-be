import { createParamDecorator, ExecutionContext } from '@nestjs/common';
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
    return request?.user?.sub;
  },
);
