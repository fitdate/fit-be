import { Request } from 'express';
import * as AWS from 'aws-sdk';

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

// export interface key: (
//   req: Request,
//   file: Express.Multer.File,
//   cb: (error: any, key: string) => void,
// ) => {}

// export interface metadata: (
//   req: Request,
//   file: Express.Multer.File,
//   cb: (error: any, metadata: any) => void,
// ) => {}

// export interface fileFilter: (
//   req: Request,
//   file: Express.Multer.File,
//   cb: (error: Error | null, acceptFile: boolean) => void,
// ) => {}

export interface MulterS3Config {
  s3: AWS.S3;
  bucket: string;
  acl?: string;
  contentType?:
    | string
    | ((
        req: Request,
        file: MulterFile,
        cb: (error: any, mime: string) => void,
      ) => void);
  key?: (
    req: Request,
    file: MulterFile,
    cb: (error: any, key: string) => void,
  ) => void;
  metadata?: (
    req: Request,
    file: MulterFile,
    cb: (error: any, metadata: any) => void,
  ) => void;
}

export interface MulterOptions {
  storage: {
    _handleFile: (
      req: Request,
      file: MulterFile,
      cb: (error: any, info: any) => void,
    ) => void;
    _removeFile: (
      req: Request,
      file: MulterFile,
      cb: (error: any) => void,
    ) => void;
  };
  limits?: {
    fileSize?: number;
  };
  fileFilter?: (
    req: Request,
    file: MulterFile,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => void;
}

export interface MulterS3Instance {
  (options: MulterS3Config): any;
  AUTO_CONTENT_TYPE: string;
}