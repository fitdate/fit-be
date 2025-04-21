import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateProfileImageDto } from './dto/create-profile-image.dto';
import { Repository } from 'typeorm';
import { ProfileImage } from './entities/profile-image.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { createReadStream } from 'fs';
import { MulterFile } from './types/multer.types';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class ProfileImageService {
  private readonly logger = new Logger(ProfileImageService.name);
  private readonly IMAGE_FOLDER = join(
    process.cwd(),
    'public',
    'profile-images',
  );
  private readonly TEMP_FOLDER = join(process.cwd(), 'public', 'temp');
  private readonly s3Client: S3Client;

  constructor(
    @InjectRepository(ProfileImage)
    private profileImageRepository: Repository<ProfileImage>,
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

  async createProfileImages(createProfileImageDto: CreateProfileImageDto) {
    this.logger.log(
      `Creating profile images for profile ID: ${createProfileImageDto.profileId}`,
    );
    const imageNames = createProfileImageDto.profileImageName;
    if (!imageNames || !Array.isArray(imageNames)) {
      this.logger.warn('Invalid profile image names provided');
      throw new BadRequestException('Profile image names are required');
    }

    try {
      const profileImages = await Promise.all(
        imageNames.map(async (imageName) => {
          this.logger.log(`Processing image: ${imageName}`);
          const tempPath = join(this.TEMP_FOLDER, imageName);
          const s3Key = `profile-images/${imageName}`;

          this.logger.log(`Uploading to S3: ${s3Key}`);
          await this.s3Client.send(
            new PutObjectCommand({
              Bucket: this.configService.getOrThrow('aws.bucketName', {
                infer: true,
              }),
              Key: s3Key,
              Body: createReadStream(tempPath),
              ContentType:
                'image/jpeg, image/png, image/gif, image/webp, image/jpg',
              ACL: 'public-read',
            }),
          );

          const profileImage = this.profileImageRepository.create({
            imageUrl: `https://${this.configService.getOrThrow('aws.bucketName', { infer: true })}.s3.${this.configService.getOrThrow('aws.region', { infer: true })}.amazonaws.com/${s3Key}`,
            profile: { id: createProfileImageDto.profileId },
          });

          await this.profileImageRepository.save(profileImage);
          this.logger.log(`Profile image saved successfully: ${imageName}`);

          return profileImage;
        }),
      );

      this.logger.log(
        `Successfully created ${profileImages.length} profile images`,
      );
      return profileImages;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to save profile images', errorMessage);
      throw new InternalServerErrorException(
        '프로필 이미지 저장에 실패했습니다.',
      );
    }
  }

  async uploadProfileImages(profileId: string, file: MulterFile) {
    this.logger.log(`Uploading profile image for profile ID: ${profileId}`);
    try {
      if (!file.filename) {
        this.logger.warn('File name is missing');
        throw new BadRequestException('File name is missing');
      }

      const createProfileImageDto = new CreateProfileImageDto();
      createProfileImageDto.profileId = profileId;
      createProfileImageDto.profileImageName = [file.filename];

      this.logger.log(`Processing file: ${file.filename}`);
      return await this.createProfileImages(createProfileImageDto);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to upload profile image: ${file.filename}`,
        errorMessage,
      );
      throw new InternalServerErrorException(
        '프로필 이미지 업로드에 실패했습니다.',
      );
    }
  }

  async updateProfileImage(
    profileId: string,
    newImageName: string,
    oldImageName: string | null,
  ) {
    this.logger.log(`Updating profile image for profile ID: ${profileId}`);
    if (!newImageName) {
      this.logger.warn('Profile image name is missing');
      throw new BadRequestException('Profile image name is required');
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

      this.logger.log(`Uploading new image: ${newImageName}`);
      const tempPath = join(this.TEMP_FOLDER, newImageName);
      const s3Key = `profile-images/${newImageName}`;
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.configService.getOrThrow('aws.bucketName', {
            infer: true,
          }),
          Key: s3Key,
          Body: createReadStream(tempPath),
          ContentType: 'image/jpeg',
          ACL: 'public-read',
        }),
      );

      const profileImage = await this.profileImageRepository.findOne({
        where: { profile: { id: profileId } },
      });

      if (profileImage) {
        profileImage.imageUrl = `https://${this.configService.getOrThrow('aws.bucketName', { infer: true })}.s3.${this.configService.getOrThrow('aws.region', { infer: true })}.amazonaws.com/${s3Key}`;
        await this.profileImageRepository.save(profileImage);
        this.logger.log(`Profile image updated successfully: ${newImageName}`);
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
}
