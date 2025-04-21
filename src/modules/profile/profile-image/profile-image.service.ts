import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProfileImage } from './entities/profile-image.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { MulterFile } from './types/multer.types';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';
import { Profile } from '../entities/profile.entity';

@Injectable()
export class ProfileImageService {
  private readonly logger = new Logger(ProfileImageService.name);
  private readonly s3Client: S3Client;

  constructor(
    @InjectRepository(ProfileImage)
    private profileImageRepository: Repository<ProfileImage>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private configService: ConfigService<AllConfig>,
  ) {
    this.logger.log('Initializing S3 client');
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow('aws.region', { infer: true }),
      credentials: {
        accessKeyId: this.configService.getOrThrow('aws.accessKeyId', {
          infer: true,
        }),
        secretAccessKey: this.configService.getOrThrow('aws.secretAccessKey', {
          infer: true,
        }),
      },
    });
    this.logger.log('S3 client initialized successfully');
  }

  async uploadProfileImages(userId: string, file: MulterFile) {
    this.logger.log(`Uploading profile image for user ID: ${userId}`);
    if (!file) {
      this.logger.warn('No file provided');
      throw new BadRequestException('No file provided');
    }

    try {
      // 프로필 찾기
      const profile = await this.profileRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (!profile) {
        throw new BadRequestException('Profile not found');
      }

      // 기존 프로필 이미지 개수 확인
      const existingImages = await this.profileImageRepository.count({
        where: { profile: { id: profile.id } },
      });

      const fileExtension = file.originalname.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const s3Key = `profile-images/${uniqueFileName}`;

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.configService.getOrThrow('aws.bucketName', {
            infer: true,
          }),
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });

      await upload.done();

      const profileImage = this.profileImageRepository.create({
        imageUrl: `https://${this.configService.getOrThrow('aws.bucketName', { infer: true })}.s3.${this.configService.getOrThrow('aws.region', { infer: true })}.amazonaws.com/${s3Key}`,
        profile: { id: profile.id },
        isMain: existingImages === 0, // 첫 이미지는 메인으로 설정
      });

      await this.profileImageRepository.save(profileImage);
      this.logger.log(`Profile image uploaded successfully: ${uniqueFileName}`);

      return profileImage;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to upload profile image', errorMessage);
      throw new InternalServerErrorException(
        '프로필 이미지 업로드에 실패했습니다.',
      );
    }
  }

  async updateProfileImage(
    profileId: string,
    file: MulterFile,
    oldImageName: string | null,
  ) {
    this.logger.log(`Updating profile image for profile ID: ${profileId}`);
    if (!file) {
      this.logger.warn('No file provided');
      throw new BadRequestException('No file provided');
    }

    try {
      if (oldImageName) {
        this.logger.log(`Deleting old image: ${oldImageName}`);
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.configService.getOrThrow('aws.bucketName', {
              infer: true,
            }),
            Key: `profile-images/${oldImageName}`,
          }),
        );
      }

      const s3Key = `profile-images/${file.originalname}`;

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.configService.getOrThrow('aws.bucketName', {
            infer: true,
          }),
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });

      await upload.done();

      const profileImage = await this.profileImageRepository.findOne({
        where: { profile: { id: profileId } },
      });

      if (profileImage) {
        profileImage.imageUrl = `https://${this.configService.getOrThrow('aws.bucketName', { infer: true })}.s3.${this.configService.getOrThrow('aws.region', { infer: true })}.amazonaws.com/${s3Key}`;
        await this.profileImageRepository.save(profileImage);
        this.logger.log(
          `Profile image updated successfully: ${file.originalname}`,
        );
      } else {
        this.logger.warn(`No profile image found for profile ID: ${profileId}`);
      }

      return profileImage;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to update profile image', errorMessage);
      throw new InternalServerErrorException(
        '프로필 이미지 업데이트에 실패했습니다.',
      );
    }
  }

  async deleteProfileImage(id: string, imageName?: string) {
    this.logger.log(`Deleting profile image with ID: ${id}`);
    try {
      const profileImage = await this.profileImageRepository.findOne({
        where: { id },
        relations: ['profile'],
      });

      if (!profileImage) {
        this.logger.warn(`Profile image not found: ${id}`);
        throw new BadRequestException('Profile image not found');
      }

      if (imageName) {
        const urlImageName = profileImage.imageUrl.split('/').pop();
        if (urlImageName !== imageName) {
          this.logger.warn(
            `Image name mismatch: expected ${imageName}, got ${urlImageName}`,
          );
          throw new BadRequestException(
            'Image name does not match the profile image',
          );
        }
      }

      this.logger.log(`Deleting from S3: ${profileImage.imageUrl}`);
      const s3Key = `profile-images/${profileImage.imageUrl.split('/').pop()}`;
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.configService.getOrThrow('aws.bucketName', {
            infer: true,
          }),
          Key: s3Key,
        }),
      );

      await this.profileImageRepository.remove(profileImage);
      this.logger.log(`Profile image deleted successfully: ${id}`);
      return { message: 'Profile image deleted successfully' };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete profile image: ${id}`, errorMessage);
      throw new InternalServerErrorException(
        '프로필 이미지 삭제에 실패했습니다.',
      );
    }
  }

  async setMainImage(profileId: string, imageId: string) {
    // 모든 이미지의 isMain을 false로 설정
    await this.profileImageRepository.update(
      { profile: { id: profileId } },
      { isMain: false },
    );

    // 선택한 이미지를 메인으로 설정
    await this.profileImageRepository.update(
      { id: imageId, profile: { id: profileId } },
      { isMain: true },
    );

    return this.profileImageRepository.findOne({
      where: { id: imageId },
    });
  }
}
