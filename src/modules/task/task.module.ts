import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { SseModule } from '../sse/sse.module';
import { UserModule } from '../user/user.module';
@Module({
  imports: [SseModule, UserModule],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
