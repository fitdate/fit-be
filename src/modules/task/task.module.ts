import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { SseModule } from '../sse/sse.module';
@Module({
  imports: [SseModule],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
