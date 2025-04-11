import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pass } from './entities/pass.entity';
import { PassService } from './pass.service';
import { PassController } from './pass.controller';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pass, User])],
  controllers: [PassController],
  providers: [PassService],
  exports: [PassService],
})
export class PassModule {}
