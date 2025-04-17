import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorator/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  getHello(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
