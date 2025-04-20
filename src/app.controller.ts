import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorator/public.decorator';
import { SkipProfileComplete } from './modules/auth/guard/profile-complete.guard';
@Controller()
export class AppController {
  @SkipProfileComplete()
  @Public()
  @Get('health')
  getHello(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
