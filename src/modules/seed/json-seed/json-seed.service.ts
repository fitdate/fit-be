import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class JsonSeedService {
  // 시드 파일 읽기
  readSeed<T>(filePath: string): T[] {
    try {
      const absolutePath = join(process.cwd(), filePath);
      const data = fs.readFileSync(absolutePath, 'utf8');
      return JSON.parse(data) as T[];
    } catch (error) {
      if (error instanceof Error) {
        throw new InternalServerErrorException(
          `Failed to read seed file: ${filePath}. Error: ${error.message}`,
        );
      }
      throw error;
    }
  }

  // 시드 파일 읽기 (변환)
  readSeedWithTransform<T, R>(
    filePath: string,
    transformFn: (data: T) => R,
  ): R[] {
    const rawData = this.readSeed<T>(filePath);
    return rawData.map(transformFn);
  }

  // 시드 파일 쓰기
  writeSeed<T>(filePath: string, data: T[]) {
    try {
      const absolutePath = join(process.cwd(), filePath);
      const dir = absolutePath.substring(
        0,
        absolutePath.lastIndexOf(process.platform === 'win32' ? '\\' : '/'),
      );

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2));
    } catch (error) {
      if (error instanceof Error) {
        throw new InternalServerErrorException(
          `Failed to write seed file: ${filePath}. Error: ${error.message}`,
        );
      }
      throw error;
    }
  }
}
