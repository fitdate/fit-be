import { Module } from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import { ProfileImageController } from './profile-image.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileImage } from './entities/profile-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileImage])],
  controllers: [ProfileImageController],
  providers: [ProfileImageService],
  exports: [ProfileImageService],
})
export class ProfileImageModule {}
