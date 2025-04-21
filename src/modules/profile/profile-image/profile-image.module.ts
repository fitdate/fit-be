import { Module } from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import { ProfileImageController } from './profile-image.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileImage } from './entities/profile-image.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { MulterModule } from '@nestjs/platform-express';
import { v4 as uuidv4 } from 'uuid';
import * as multerS3 from 'multer-s3';
import { AllConfig } from 'src/common/config/config.types';
import { Request } from 'express';
import {
  MulterOptions,
  MulterS3Config,
  MulterFile,
} from './types/multer.types';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileImage]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfig>) => {
        const s3 = new AWS.S3({
          region: configService.getOrThrow('aws.region', { infer: true }),
          credentials: {
            accessKeyId: configService.getOrThrow('aws.accessKeyId', {
              infer: true,
            }),
            secretAccessKey: configService.getOrThrow('aws.secretAccessKey', {
              infer: true,
            }),
          },
        });

        const s3Config: MulterS3Config = {
          s3,
          bucket: configService.getOrThrow('aws.bucketName', { infer: true }),
          acl: 'public-read',
          contentType: (req, file, cb) => {
            cb(null, file.mimetype);
          },
          key: (
            req: Request,
            file: MulterFile,
            cb: (error: any, key: string) => void,
          ) => {
            const fileName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
            cb(null, `profile-images/${fileName}`);
          },
          metadata: (
            req: Request,
            file: MulterFile,
            cb: (error: any, metadata: any) => void,
          ) => {
            cb(null, { fieldName: file.fieldname });
          },
        };

        const options: MulterOptions = {
          storage: multerS3(s3Config),
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
        };

        return options;
      },
    }),
  ],
  controllers: [ProfileImageController],
  providers: [ProfileImageService],
  exports: [ProfileImageService],
})
export class ProfileImageModule {}
