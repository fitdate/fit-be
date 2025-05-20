import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { SseModule } from '../sse/sse.module';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import { TaskController } from './task.controller';
@Module({
  imports: [SseModule, UserModule, NotificationModule],
  providers: [TaskService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
