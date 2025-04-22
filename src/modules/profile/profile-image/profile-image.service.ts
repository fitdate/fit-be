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
import { DataSource } from 'typeorm';

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
    private dataSource: DataSource,
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

  async uploadProfileImages(userId: string, files: MulterFile[]) {
    this.logger.log(`Uploading profile images for user ID: ${userId}`);
    if (!files || files.length === 0) {
      this.logger.warn('No files provided');
      throw new BadRequestException('No files provided');
    }

    try {
      // 프로필 찾기
      const profile = await this.profileRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (!profile) {
        throw new BadRequestException(
          `Profile not found for user ID: ${userId}. Please create a profile first.`,
        );
      }

      // 기존 프로필 이미지 개수 확인
      const existingImages = await this.profileImageRepository.count({
        where: { profile: { id: profile.id } },
      });

      const uploadedImages: ProfileImage[] = [];
      for (const file of files) {
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
          isMain: existingImages + uploadedImages.length === 0, // 첫 이미지는 메인으로 설정
        });

        await this.profileImageRepository.save(profileImage);
        uploadedImages.push(profileImage);
        this.logger.log(
          `Profile image uploaded successfully: ${uniqueFileName}`,
        );
      }

      return uploadedImages;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('파일 업로드 실패', errorMessage);
      throw new InternalServerErrorException(
        '프로필 이미지 업로드에 실패했습니다.',
      );
    }
  }

  async updateProfileImages(
    profileId: string,
    files: MulterFile[],
    oldImageIds: string[],
  ) {
    this.logger.log(`Updating profile images for profile ID: ${profileId}`);
    if (!files || files.length === 0) {
      this.logger.warn('업로드된 파일이 없습니다.');
      throw new BadRequestException('업로드된 파일이 없습니다.');
    }
    try {
      // 기존 이미지 삭제
      if (oldImageIds && oldImageIds.length > 0) {
        for (const imageId of oldImageIds) {
          await this.deleteProfileImage(imageId);
        }
      }

      // 새 이미지 업로드
      const uploadedImages: ProfileImage[] = [];
      for (const file of files) {
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
          profile: { id: profileId },
          isMain: uploadedImages.length === 0, // 첫 이미지는 메인으로 설정
        });

        await this.profileImageRepository.save(profileImage);
        uploadedImages.push(profileImage);
        this.logger.log(
          `Profile image uploaded successfully: ${uniqueFileName}`,
        );
      }

      return uploadedImages;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('파일 업데이트 실패', errorMessage);
      throw new InternalServerErrorException(
        '프로필 이미지 업데이트에 실패했습니다.',
      );
    }
  }

  async deleteProfileImages(ids: string[]) {
    this.logger.log(`Deleting profile images with IDs: ${ids.join(', ')}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deletedImages: ProfileImage[] = [];
      for (const id of ids) {
        const profileImage = await queryRunner.manager.findOne(ProfileImage, {
          where: { id },
          relations: ['profile'],
        });

        if (!profileImage) {
          this.logger.warn(`프로필 이미지 찾을 수 없음: ${id}`);
          continue;
        }

        // S3에서 삭제
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

        // DB에서 삭제
        await queryRunner.manager.remove(profileImage);
        deletedImages.push(profileImage);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Profile images deleted successfully: ${ids.join(', ')}`);
      return { message: 'Profile images deleted successfully' };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to delete profile images: ${ids.join(', ')}`,
        errorMessage,
      );
      throw new InternalServerErrorException(
        '프로필 이미지 삭제에 실패했습니다.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async deleteProfileImage(id: string) {
    this.logger.log(`프로필 이미지 삭제제: ${id}`);
    if (!id) {
      throw new BadRequestException('이미지 ID가 제공되지 않았습니다.');
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const profileImage = await queryRunner.manager.findOne(ProfileImage, {
        where: { id },
        relations: ['profile'],
      });

      if (!profileImage) {
        this.logger.warn(`프로필 이미지 찾을 수 없음: ${id}`);
        throw new BadRequestException('프로필 이미지 찾을 수 없음');
      }

      // S3에서 삭제
      this.logger.log(`S3에서 삭제: ${profileImage.imageUrl}`);
      const s3Key = `profile-images/${profileImage.imageUrl.split('/').pop()}`;
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.configService.getOrThrow('aws.bucketName', {
            infer: true,
          }),
          Key: s3Key,
        }),
      );

      // DB에서 삭제
      await queryRunner.manager.remove(profileImage);
      await queryRunner.commitTransaction();

      this.logger.log(`Profile image deleted successfully: ${id}`);
      return { message: 'Profile image deleted successfully' };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete profile image: ${id}`, errorMessage);
      throw new InternalServerErrorException(
        '프로필 이미지 삭제에 실패했습니다.',
      );
    } finally {
      await queryRunner.release();
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

  async getProfileImages(userId: string) {
    this.logger.log(`프로필 이미지 조회: ${userId}`);
    try {
      // 프로필 찾기
      const profile = await this.profileRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!profile) {
        throw new BadRequestException(
          `프로필 찾을 수 없음: ${userId}. 프로필 생성 후 다시 시도해주세요.`,
        );
      }

      // 프로필 이미지들 가져오기
      const images = await this.profileImageRepository.find({
        where: { profile: { id: profile.id } },
        order: { isMain: 'DESC' }, // 메인 이미지가 먼저 오도록 정렬
      });

      this.logger.log(`프로필 이미지 조회 성공: ${images.length}개`);
      return images;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('프로필 이미지 조회 실패', errorMessage);
      throw new InternalServerErrorException(
        '프로필 이미지 조회에 실패했습니다.',
      );
    }
  }
}
