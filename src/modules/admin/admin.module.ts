import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { UserModule } from '../user/user.module';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Admin]), UserModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
