import { Module } from '@nestjs/common';
import { UserFilterService } from './user-filter.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFilter } from './entities/user-filter.entity';
import { UserModule } from '../user/user.module';
import { UserFilterController } from './user-filter.controller';
@Module({
  imports: [TypeOrmModule.forFeature([UserFilter]), UserModule],
  controllers: [UserFilterController],
  providers: [UserFilterService],
  exports: [UserFilterService],
})
export class UserFilterModule {}
