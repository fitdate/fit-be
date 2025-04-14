import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller()
export class AppController {
  @Get('health')
  getHello(): string {
    return 'ok';
  }
}
