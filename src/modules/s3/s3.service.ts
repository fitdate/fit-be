import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from 'src/common/config/config.types';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';
import { MulterFile } from './types/multer.types';
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService<AllConfig>) {
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

  // URL에서 키 추출
  extractKeyFromUrl(url: string): string {
    const urlSplit = url.split('.amazonaws.com/');
    if (urlSplit.length !== 2) {
      throw new BadRequestException('유효하지 않은 URL입니다');
    }
    return urlSplit[1];
  }

  // 파일 업로드
  async uploadFile(
    folderName: string,
    file: MulterFile,
    bucketName: string,
  ): Promise<string> {
    this.logger.log(`${bucketName} 버킷에 파일 업로드 시작`);
    if (!file) {
      this.logger.warn('업로드할 파일이 없습니다');
      throw new BadRequestException('업로드할 파일이 없습니다');
    }

    try {
      const fileExtension = file.originalname.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const s3Key = `${folderName}/${uniqueFileName}`;

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });

      await upload.done();

      return s3Key;
    } catch (error) {
      this.logger.error(`${bucketName} 버킷에 파일 업로드 중 오류 발생`, error);
      throw new InternalServerErrorException(
        '파일 업로드 중 오류가 발생했습니다',
      );
    }
  }

  // 여러 파일 업로드
  async uploadFiles(
    folderName: string,
    files: MulterFile[],
    bucketName: string,
  ): Promise<string[]> {
    this.logger.log(`${bucketName} 버킷에 파일 업로드 시작`);
    if (!files || files.length === 0) {
      this.logger.warn('업로드할 파일이 없습니다');
      throw new BadRequestException('업로드할 파일이 없습니다');
    }

    try {
      const uploadedFiles: string[] = [];
      for (const file of files) {
        const fileExtension = file.originalname.split('.').pop();
        const uniqueFileName = `${uuidv4()}.${fileExtension}`;
        const s3Key = `${folderName}/${uniqueFileName}`;

        const upload = new Upload({
          client: this.s3Client,
          params: {
            Bucket: bucketName,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
          },
        });

        await upload.done();

        uploadedFiles.push(s3Key);
      }

      return uploadedFiles;
    } catch (error) {
      this.logger.error(`${bucketName} 버킷에 파일 업로드 중 오류 발생`, error);
      throw new InternalServerErrorException(
        '파일 업로드 중 오류가 발생했습니다',
      );
    }
  }

  // 여러 파일 업데이트
  async updateFiles(
    files: MulterFile[],
    bucketName: string,
    oldFileKeys: string[],
    folderName: string,
  ): Promise<string[]> {
    this.logger.log(`${bucketName} 버킷에 파일 업데이트 시작`);
    if (!files || files.length === 0) {
      this.logger.warn('업로드할 파일이 없습니다');
      throw new BadRequestException('업로드할 파일이 없습니다');
    }

    try {
      if (oldFileKeys && oldFileKeys.length > 0) {
        for (const oldFileKey of oldFileKeys) {
          await this.deleteFiles([oldFileKey], bucketName);
        }
      }

      const uploadedFiles: string[] = [];
      for (const file of files) {
        const fileExtension = file.originalname.split('.').pop();
        const uniqueFileName = `${uuidv4()}.${fileExtension}`;
        const s3Key = `${folderName}/${uniqueFileName}`;

        const upload = new Upload({
          client: this.s3Client,
          params: {
            Bucket: bucketName,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
          },
        });

        await upload.done();

        uploadedFiles.push(s3Key);
      }

      return uploadedFiles;
    } catch (error) {
      this.logger.error(
        `${bucketName} 버킷에 파일 업데이트 중 오류 발생`,
        error,
      );
      throw new InternalServerErrorException(
        '파일 업데이트 중 오류가 발생했습니다',
      );
    }
  }

  // 파일 삭제
  async deleteFile(fileKey: string, bucketName: string) {
    this.logger.log(`${fileKey} 파일 삭제 시작`);
    if (!fileKey) {
      this.logger.warn('삭제할 파일이 없습니다');
      throw new BadRequestException('삭제할 파일이 없습니다');
    }

    const deleteParams = {
      Bucket: bucketName,
      Key: fileKey,
    };

    try {
      await this.s3Client.send(new DeleteObjectCommand(deleteParams));
      this.logger.log(`${fileKey} 파일 삭제 완료`);
    } catch (error) {
      this.logger.error(`${fileKey} 파일 삭제 중 오류 발생`, error);
      throw new InternalServerErrorException(
        '파일 삭제 중 오류가 발생했습니다',
      );
    }
  }

  // 여러 파일 삭제
  async deleteFiles(fileKeys: string[], bucketName: string) {
    this.logger.log(`${fileKeys.join(', ')} 파일 삭제 시작`);
    if (!fileKeys || fileKeys.length === 0) {
      this.logger.warn('삭제할 파일이 없습니다');
      throw new BadRequestException('삭제할 파일이 없습니다');
    }

    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: fileKeys.map((key) => ({ Key: key })),
      },
    };

    try {
      await this.s3Client.send(new DeleteObjectsCommand(deleteParams));
      this.logger.log(`${fileKeys.join(', ')} 파일 삭제 완료`);
    } catch (error) {
      this.logger.error(`${fileKeys.join(', ')} 파일 삭제 중 오류 발생`, error);
      throw new InternalServerErrorException(
        '파일 삭제 중 오류가 발생했습니다',
      );
    }
  }

  // 파일 URL 조회
  getFileUrls(fileKeys: string[]) {
    const bucketName = this.configService.getOrThrow('aws.bucketName', {
      infer: true,
    });
    const region = this.configService.getOrThrow('aws.region', { infer: true });
    const fileUrls = fileKeys.map((key) => ({
      key,
      url: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
    }));
    return fileUrls;
  }
}
