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
import { MulterFile } from '../../s3/types/multer.types';
import {
  S3Client,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { Profile } from '../entities/profile.entity';
import { DataSource } from 'typeorm';
import { S3Service } from '../../s3/s3.service';
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
    private s3Service: S3Service,
  ) {
    this.logger.log('S3 클라이언트 초기화 중...');
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
    this.logger.log('S3 클라이언트 초기화 완료');
  }

  async deleteProfileImage(id: string) {
    this.logger.log(`프로필 이미지 삭제 시작: ${id}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const profileImage = await queryRunner.manager.findOne(ProfileImage, {
        where: { id },
        relations: ['profile'],
      });

      if (!profileImage) {
        this.logger.warn(`프로필 이미지를 찾을 수 없습니다: ${id}`);
        throw new BadRequestException('프로필 이미지를 찾을 수 없습니다');
      }

      // S3에서 삭제
      this.logger.log(`S3에서 삭제 중: ${profileImage.imageUrl}`);
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

      this.logger.log(`프로필 이미지 삭제 완료: ${id}`);
      return { message: '프로필 이미지가 성공적으로 삭제되었습니다.' };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.error(`프로필 이미지 삭제 실패: ${id}`, errorMessage);
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
    this.logger.log(`사용자 ID ${userId}의 프로필 이미지 조회 시작`);
    try {
      // 프로필 찾기
      const profile = await this.profileRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!profile) {
        throw new BadRequestException(
          `사용자 ID ${userId}에 대한 프로필을 찾을 수 없습니다. 먼저 프로필을 생성해주세요.`,
        );
      }

      // 프로필 이미지들 가져오기
      const images = await this.profileImageRepository.find({
        where: { profile: { id: profile.id } },
        order: { isMain: 'DESC' }, // 메인 이미지가 먼저 오도록 정렬
      });

      this.logger.log(`프로필 이미지 조회 완료: ${images.length}개`);
      return images;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';
      this.logger.error('프로필 이미지 조회 실패', errorMessage);
      throw new InternalServerErrorException(
        '프로필 이미지 조회에 실패했습니다.',
      );
    }
  }

  //임시 폴더에 이미지 업로드
  async uploadTempImage(file: MulterFile) {
    this.logger.log('임시 이미지 업로드 시작');
    const folderName = 'temp';
    const bucketName = this.configService.getOrThrow('aws.bucketName', {
      infer: true,
    });
    const region = this.configService.getOrThrow('aws.region', { infer: true });
    try {
      const key = await this.s3Service.uploadFile(folderName, file, bucketName);
      this.logger.log(`임시 이미지 업로드 완료: ${key}`);
      return {
        url: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
      };
    } catch (error) {
      this.logger.error('임시 이미지 업로드 실패', error);
      throw new InternalServerErrorException(
        '임시 이미지 업로드에 실패했습니다.',
      );
    }
  }

  //임시 폴더에 이미지 삭제
  async deleteTempImage(url: string) {
    const bucketName = this.configService.getOrThrow('aws.bucketName', {
      infer: true,
    });
    await this.s3Service.deleteFile(url, bucketName);
  }

  async moveTempToProfileImage(profileId: string, fileKey: string) {
    this.logger.log(`임시 이미지를 프로필 이미지로 이동 시작: ${fileKey}`);
    const bucketName = this.configService.getOrThrow('aws.bucketName', {
      infer: true,
    });
    const region = this.configService.getOrThrow('aws.region', { infer: true });

    try {
      // fileKey가 이미 'temp/uuid.jpg' 형식이므로 그대로 사용
      const fileName = fileKey.split('/').pop();
      if (!fileName) {
        throw new BadRequestException('잘못된 파일 경로입니다.');
      }

      const newKey = `profile-images/${profileId}/${fileName}`;
      const copySource = `${bucketName}/${fileKey}`;

      this.logger.log(`이미지 복사 시작: ${fileKey} -> ${newKey}`);
      this.logger.log(`CopySource: ${copySource}`);
      this.logger.log(`Bucket: ${bucketName}`);
      this.logger.log(`NewKey: ${newKey}`);

      const copy = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: copySource,
        Key: newKey,
      });

      await this.s3Client.send(copy);
      this.logger.log('이미지 복사 완료');

      this.logger.log(`임시 이미지 삭제 시작: ${fileKey}`);
      await this.s3Service.deleteFile(fileKey, bucketName);
      this.logger.log('임시 이미지 삭제 완료');

      this.logger.log('이미지 이동 완료');
      return {
        key: newKey,
        url: `https://${bucketName}.s3.${region}.amazonaws.com/${newKey}`,
      };
    } catch (error) {
      this.logger.error('이미지 이동 실패', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('이미지 이동에 실패했습니다.');
    }
  }

  async processImagesInChunks(
    images: string[],
    profileId: string,
    log: (message: string) => void,
  ) {
    const CHUNK_SIZE = 3; // 동시에 처리할 이미지 수
    const results: Array<{
      profile: { id: string };
      imageUrl: string;
      key: string;
      isMain: boolean;
    } | null> = [];

    log(`Starting to process ${images.length} images`);
    log(`Input images: ${JSON.stringify(images, null, 2)}`);

    for (let i = 0; i < images.length; i += CHUNK_SIZE) {
      const chunk = images.slice(i, i + CHUNK_SIZE);
      log(
        `Processing chunk ${i / CHUNK_SIZE + 1}: ${JSON.stringify(chunk, null, 2)}`,
      );
      const chunkResults = await Promise.all(
        chunk.map(async (url, index) => {
          try {
            log(`Processing image ${i + index + 1}: ${url}`);
            if (!url) {
              log(`Skipping null/undefined URL at index ${i + index}`);
              return null;
            }

            log(`Extracting key from URL: ${url}`);
            const key = this.s3Service.extractKeyFromUrl(url);
            log(`Extracted key: ${key}`);
            log(
              `URL components: ${JSON.stringify(url.split('.amazonaws.com/'), null, 2)}`,
            );

            log(
              `Moving temp image to profile image: profileId=${profileId}, key=${key}`,
            );
            const moved = await this.moveTempToProfileImage(profileId, key);
            log(`Moved image result: ${JSON.stringify(moved, null, 2)}`);

            const cloudfrontUrl = `https://d22i603q3n4pzb.cloudfront.net/${moved.key}`;
            moved.url = cloudfrontUrl;
            const result = {
              profile: { id: profileId },
              imageUrl: moved.url,
              key: moved.key,
              isMain: i + index === 0,
            };
            log(
              `Created profile image object: ${JSON.stringify(result, null, 2)}`,
            );
            return result;
          } catch (err) {
            log(
              `Failed to process image ${i + index + 1}: ${
                err instanceof Error ? err.message : err
              }`,
            );
            if (err instanceof Error && err.stack) {
              log(`Error stack: ${err.stack}`);
            }
            return null;
          }
        }),
      );
      log(
        `Chunk ${i / CHUNK_SIZE + 1} results: ${JSON.stringify(chunkResults, null, 2)}`,
      );
      results.push(...chunkResults);
    }

    const filteredResults = results.filter(
      (img): img is NonNullable<typeof img> => img !== null,
    );
    log(`Final filtered results: ${JSON.stringify(filteredResults, null, 2)}`);
    return filteredResults;
  }
}
