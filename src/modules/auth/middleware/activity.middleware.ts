import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { AuthService } from '../auth.service';
import { RequestWithUser } from '../types/request.types';

@Injectable()
export class ActivityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ActivityMiddleware.name);

  constructor(private readonly authService: AuthService) {}

  async use(req: RequestWithUser, res: Response, next: NextFunction) {
    const userId = req.user?.sub;
    if (!userId) {
      return next();
    }

    try {
      const isActive = await this.authService.checkAndRefreshActivity(userId);
      if (!isActive) {
        // Clear cookies and throw unauthorized
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        throw new UnauthorizedException(
          '세션이 만료되었습니다. 다시 로그인해주세요.',
        );
      }

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // 다른 에러의 경우 로그를 남기고 다음 미들웨어로 진행
      this.logger.error('Activity check failed:', error);
      next();
    }
  }
}
