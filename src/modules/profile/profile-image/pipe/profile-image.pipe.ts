import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { v4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import * as sharp from 'sharp';
import { MulterFile } from '../types/multer.types';

@Injectable()
export class ProfileImageFilePipe
  implements PipeTransform<MulterFile[], Promise<MulterFile[]>>
{
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly WARNING_FILE_SIZE = 500 * 1024; // 500KB
  private readonly DEFAULT_QUALITY = 100;
  private readonly TEMP_DIR = join(process.cwd(), 'public', 'temp');
  private readonly IMAGE_DIR = join(process.cwd(), 'public', 'profile-images');

  constructor(
    private readonly options: {
      maxSize: number; // MB
      allowedMimeTypes: string[];
      resize?: {
        width: number;
        height: number;
      };
      quality?: number; // 기본 100
    },
  ) {
    this.ensureDirectories().catch((error) => {
      console.error('Failed to create directories:', error);
    });
  }

  private async ensureDirectories() {
    try {
      await mkdir(this.TEMP_DIR, { recursive: true });
      await mkdir(this.IMAGE_DIR, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw new BadRequestException('디렉토리를 생성할 수 없습니다.');
      }
    }
  }

  private calculateQuality(fileSize: number): number {
    if (fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `이미지 용량이 너무 큽니다. 최대 ${this.MAX_FILE_SIZE / 1024 / 1024}MB 이하만 가능합니다.`,
      );
    }

    if (fileSize <= this.WARNING_FILE_SIZE) {
      return this.DEFAULT_QUALITY;
    }

    const sizeRatio =
      (fileSize - this.WARNING_FILE_SIZE) /
      (this.MAX_FILE_SIZE - this.WARNING_FILE_SIZE);
    return Math.max(
      60,
      Math.floor(this.DEFAULT_QUALITY * (1 - sizeRatio * 0.4)),
    );
  }

  private async processFile(file: MulterFile): Promise<MulterFile> {
    if (!file || !file.mimetype || !file.originalname) {
      throw new BadRequestException('올바른 이미지 파일이 필요합니다.');
    }

    console.log('File info:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      allowedTypes: this.options.allowedMimeTypes,
      destination: file.destination,
      path: file.path,
    });

    const byteSize = this.options.maxSize * 10 ** 6;
    if (!file.size || file.size > byteSize) {
      throw new BadRequestException(
        `이미지 용량은 최대 ${this.options.maxSize}MB 이하만 가능합니다.`,
      );
    }

    const normalizedMimetype = file.mimetype.toLowerCase();
    const normalizedAllowedTypes = this.options.allowedMimeTypes.map((type) =>
      type.toLowerCase(),
    );

    if (
      !this.options.allowedMimeTypes?.length ||
      !normalizedAllowedTypes.includes(normalizedMimetype)
    ) {
      throw new BadRequestException(
        `지원하지 않는 이미지 형식입니다. (${this.options.allowedMimeTypes.join(', ')})`,
      );
    }

    await this.ensureDirectories();

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${v4()}_${Date.now()}.${ext}`;
    const newPath = join(this.TEMP_DIR, filename);

    let imageBuffer: Buffer;
    if (file.buffer) {
      imageBuffer = file.buffer;
    } else if (file.path) {
      imageBuffer = await sharp(file.path).toBuffer();
    } else {
      throw new BadRequestException('올바른 파일 데이터가 필요합니다.');
    }

    let image = sharp(imageBuffer);

    if (this.options.resize) {
      image = image.resize(
        this.options.resize.width,
        this.options.resize.height,
        {
          fit: 'cover',
        },
      );
    }

    const quality = this.calculateQuality(file.size);

    switch (normalizedMimetype) {
      case 'image/jpeg':
      case 'image/jpg':
        image = image.jpeg({ quality });
        break;
      case 'image/png':
        image = image.png({ quality });
        break;
      case 'image/webp':
        image = image.webp({ quality });
        break;
      case 'image/gif':
        break;
      default:
        break;
    }

    const buffer =
      normalizedMimetype === 'image/gif' ? imageBuffer : await image.toBuffer();

    await writeFile(newPath, buffer);

    return {
      ...file,
      filename,
      destination: this.TEMP_DIR,
      path: newPath,
      size: buffer.length,
    };
  }

  async transform(
    files: MulterFile[] | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _metadata: ArgumentMetadata,
  ): Promise<MulterFile[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    const processedFiles = await Promise.all(
      files.map((file) => this.processFile(file)),
    );

    return processedFiles;
  }
}
