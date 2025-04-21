import { Module } from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import { ProfileImageController } from './profile-image.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileImage } from './entities/profile-image.entity';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { Request } from 'express';
import { MulterFile } from './types/multer.types';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileImage]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        storage: memoryStorage(),
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
        },
        fileFilter: (
          req: Request,
          file: MulterFile,
          cb: (error: Error | null, acceptFile: boolean) => void,
        ) => {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
          ];
          if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files are allowed!'), false);
          }
          cb(null, true);
        },
      }),
    }),
  ],
  controllers: [ProfileImageController],
  providers: [ProfileImageService],
  exports: [ProfileImageService],
})
export class ProfileImageModule {}
