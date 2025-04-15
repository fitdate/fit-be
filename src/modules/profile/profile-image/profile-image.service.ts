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
import { readdir, rename, unlink } from 'fs/promises';

@Injectable()
export class ProfileImageService {
  private readonly logger = new Logger(ProfileImageService.name);
  private readonly IMAGE_FOLDER = join(
    process.cwd(),
    'public',
    'profile-images',
  );
  private readonly TEMP_FOLDER = join(process.cwd(), 'public', 'temp');
  constructor(
    @InjectRepository(ProfileImage)
    private profileImageRepository: Repository<ProfileImage>,
  ) {}

  async getManyProfileImages(): Promise<string[]> {
    try {
      const files = await readdir(this.IMAGE_FOLDER);
      return files.map((filename) => `/profile-images/${filename}`);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error('이미지 목록 불러오기 실패', e.stack);
      throw new InternalServerErrorException(
        '프로필 이미지 목록을 불러올 수 없습니다.',
      );
    }
  }

  async createProfileImages(createProfileImageDto: CreateProfileImageDto) {
    const imageName = createProfileImageDto.profileImageName;

    const tempPath = join(this.TEMP_FOLDER, imageName);
    const targetPath = join(this.IMAGE_FOLDER, imageName);

    try {
      // temp 디렉토리에 직접 저장
      const profileImage = this.profileImageRepository.create({
        imageUrl: `/temp/${imageName}`,
        profile: { id: createProfileImageDto.profileId },
      });

      await this.profileImageRepository.save(profileImage);
      this.logger.log(`Profile image saved successfully: ${imageName}`);
    } catch (e) {
      this.logger.error(`Failed to save profile image: ${imageName}`, e.stack);

      try {
        await unlink(tempPath);
        this.logger.log('Temporary file cleaned up successfully');
      } catch (deleteErr) {
        this.logger.error('Failed to clean up temporary file', deleteErr.stack);
      }
      throw new InternalServerErrorException(
        '프로필 이미지 저장에 실패했습니다.',
      );
    }
  }

  async updateProfileImage(
    profileId: string,
    newImageName: string,
    oldImageName: string,
  ) {
    if (newImageName === undefined || newImageName === null) {
      this.logger.warn('Profile image name is missing');
      throw new BadRequestException('Profile image name is required');
    }
    if (!oldImageName) {
      this.logger.warn('Image file is missing');
      throw new BadRequestException('Image file is required');
    }

    const oldPath = join(this.IMAGE_FOLDER, oldImageName);
    const newPath = join(this.IMAGE_FOLDER, newImageName);

    try {
      await unlink(oldPath);
      this.logger.log(`Old image deleted successfully: ${oldImageName}`);
    } catch (e) {
      this.logger.warn(
        `Failed to delete old image (may not exist): ${oldImageName}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        e.stack,
      );
    }

    try {
      await rename(
        join(process.cwd(), 'public', 'temp', newImageName),
        newPath,
      );
      this.logger.log(`New image saved successfully: ${newImageName}`);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error('Failed to save new image', e.stack);
      throw new InternalServerErrorException('프로필 이미지 변경 실패');
    }
  }

  async deleteProfileImage(imageName: string) {
    const imagePath = join(
      process.cwd(),
      'public',
      'profile-images',
      imageName,
    );

    try {
      await unlink(imagePath);
      this.logger.log(`Profile image deleted successfully: ${imageName}`);
    } catch (e) {
      this.logger.error(
        `Failed to delete profile image (may not exist): ${imageName}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        e.stack,
      );
    }
  }
}
