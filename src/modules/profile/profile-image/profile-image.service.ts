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
import * as AWS from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { createReadStream } from 'fs';
import { MulterFile } from './types/multer.types';

@Injectable()
export class ProfileImageService {
  private readonly logger = new Logger(ProfileImageService.name);
  private readonly IMAGE_FOLDER = join(
    process.cwd(),
    'public',
    'profile-images',
  );
  private readonly TEMP_FOLDER = join(process.cwd(), 'public', 'temp');
  private readonly s3: AWS.S3;

  constructor(
    @InjectRepository(ProfileImage)
    private profileImageRepository: Repository<ProfileImage>,
    private configService: ConfigService<AllConfig>,
  ) {
    this.s3 = new AWS.S3({
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
  }

  async createProfileImages(createProfileImageDto: CreateProfileImageDto) {
    const imageNames = createProfileImageDto.profileImageName;
    if (!imageNames || !Array.isArray(imageNames)) {
      throw new BadRequestException('Profile image names are required');
    }

    try {
      const profileImages = await Promise.all(
        imageNames.map(async (imageName) => {
          const tempPath = join(this.TEMP_FOLDER, imageName);
          const s3Upload = await this.s3
            .upload({
              Bucket: this.configService.getOrThrow('aws.bucketName', {
                infer: true,
              }),
              Key: `profile-images/${imageName}`,
              Body: createReadStream(tempPath),
              ContentType: 'image/jpeg',
              ACL: 'public-read',
            })
            .promise();

          const profileImage = this.profileImageRepository.create({
            imageUrl: s3Upload.Location,
            profile: { id: createProfileImageDto.profileId },
          });

          await this.profileImageRepository.save(profileImage);
          this.logger.log(`Profile image saved successfully: ${imageName}`);

          return profileImage;
        }),
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

  async uploadProfileImages(
    profileId: string,
    imageName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _file: MulterFile,
  ) {
    try {
      const createProfileImageDto = new CreateProfileImageDto();
      createProfileImageDto.profileId = profileId;
      createProfileImageDto.profileImageName = [imageName];

      return await this.createProfileImages(createProfileImageDto);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to upload profile image: ${imageName}`,
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
    if (!newImageName) {
      this.logger.warn('Profile image name is missing');
      throw new BadRequestException('Profile image name is required');
    }

    try {
      // Delete old image from S3 if exists
      if (oldImageName) {
        await this.s3
          .deleteObject({
            Bucket: this.configService.getOrThrow('aws.bucketName', {
              infer: true,
            }),
            Key: `profile-images/${oldImageName}`,
          })
          .promise();
      }

      // Upload new image to S3
      const tempPath = join(this.TEMP_FOLDER, newImageName);
      const s3Upload = await this.s3
        .upload({
          Bucket: this.configService.getOrThrow('aws.bucketName', {
            infer: true,
          }),
          Key: `profile-images/${newImageName}`,
          Body: createReadStream(tempPath),
          ContentType: 'image/jpeg',
          ACL: 'public-read',
        })
        .promise();

      // Update database record
      const profileImage = await this.profileImageRepository.findOne({
        where: { profile: { id: profileId } },
      });

      if (profileImage) {
        profileImage.imageUrl = s3Upload.Location;
        await this.profileImageRepository.save(profileImage);
      }

      this.logger.log(`Profile image updated successfully: ${newImageName}`);
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
    try {
      // Find the profile image by id
      const profileImage = await this.profileImageRepository.findOne({
        where: { id },
        relations: ['profile'],
      });

      if (!profileImage) {
        throw new BadRequestException('Profile image not found');
      }

      // If imageName is provided, verify it matches the profile image
      if (imageName) {
        const urlImageName = profileImage.imageUrl.split('/').pop();
        if (urlImageName !== imageName) {
          throw new BadRequestException(
            'Image name does not match the profile image',
          );
        }
      }

      // Delete from S3
      const s3Key = `profile-images/${profileImage.imageUrl.split('/').pop()}`;
      await this.s3
        .deleteObject({
          Bucket: this.configService.getOrThrow('aws.bucketName', {
            infer: true,
          }),
          Key: s3Key,
        })
        .promise();

      // Delete from database
      await this.profileImageRepository.remove(profileImage);

      this.logger.log(`Profile image deleted successfully: ${profileImage.id}`);
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
