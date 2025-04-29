import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import * as sharp from 'sharp';
import { MulterFile } from '../../../s3/types/multer.types';

@Injectable()
export class ProfileImageFilePipe
  implements
    PipeTransform<MulterFile | MulterFile[], Promise<MulterFile | MulterFile[]>>
{
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly DEFAULT_QUALITY = 100;

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
  ) {}

  private calculateQuality(fileSize: number): number {
    if (fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `이미지 용량이 너무 큽니다. 최대 ${this.MAX_FILE_SIZE / 1024 / 1024}MB 이하만 가능합니다.`,
      );
    }

    const sizeRatio = fileSize / this.MAX_FILE_SIZE;
    return Math.max(
      60,
      Math.floor(this.DEFAULT_QUALITY * (1 - sizeRatio * 0.4)),
    );
  }

  private async processFile(file: MulterFile): Promise<MulterFile> {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }

    // 파일 크기 검증
    if (file.size > this.options.maxSize * 1024 * 1024) {
      throw new BadRequestException(
        `파일 크기가 ${this.options.maxSize}MB를 초과합니다.`,
      );
    }

    // MIME 타입 검증
    if (
      this.options.allowedMimeTypes &&
      !this.options.allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new BadRequestException(
        `허용되지 않는 파일 형식입니다: ${file.mimetype}`,
      );
    }

    // 리사이징 및 품질 조정
    let image = sharp(file.buffer);
    if (this.options.resize) {
      const { width, height } = this.options.resize;
      image = image.resize(width, height, { fit: 'cover' });
    }

    const quality = this.options.quality || this.calculateQuality(file.size);

    let buffer: Buffer;
    switch (file.mimetype) {
      case 'image/jpeg':
      case 'image/jpg':
        buffer = await image.jpeg({ quality }).toBuffer();
        break;
      case 'image/png':
        buffer = await image.png({ quality }).toBuffer();
        break;
      case 'image/webp':
        buffer = await image.webp({ quality }).toBuffer();
        break;
      case 'image/gif':
        buffer = file.buffer; // GIF는 변환하지 않음
        break;
      default:
        throw new BadRequestException('지원하지 않는 이미지 형식입니다.');
    }

    // 변환된 파일 데이터를 반환
    return {
      ...file,
      buffer,
      size: buffer.length,
    };
  }

  async transform(
    files: MulterFile | MulterFile[] | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _metadata: ArgumentMetadata,
  ): Promise<MulterFile | MulterFile[]> {
    if (!files || (Array.isArray(files) && files.length === 0)) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    if (Array.isArray(files)) {
      return Promise.all(files.map((file) => this.processFile(file)));
    } else {
      return this.processFile(files);
    }
  }
}
