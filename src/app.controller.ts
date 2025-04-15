import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from './common/decorator/public.decorator';
@Public()
@ApiBearerAuth('access-token')
@Controller()
export class AppController {
  @Get('health')
  getHello(): string {
    return 'ok';
  }
}
