import { Module } from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import { ProfileImageController } from './profile-image.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileImage } from './entities/profile-image.entity';
import { Profile } from '../entities/profile.entity';
import { S3Module } from 'src/modules/s3/s3.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileImage, Profile]), S3Module],
  controllers: [ProfileImageController],
  providers: [ProfileImageService],
  exports: [ProfileImageService],
})
export class ProfileImageModule {}
