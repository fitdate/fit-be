import { Module } from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import { ProfileImageController } from './profile-image.controller';

@Module({
  controllers: [ProfileImageController],
  providers: [ProfileImageService],
})
export class ProfileImageModule {}
