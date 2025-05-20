import { Controller, Get } from '@nestjs/common';
import { TaskService } from './task.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @ApiOperation({ summary: '월드컵 테스트' })
  @Get('world-cup')
  async worldCupTest() {
    return this.taskService.worldCupTest();
  }
}
