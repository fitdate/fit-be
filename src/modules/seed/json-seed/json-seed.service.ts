import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class JsonSeedService {
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

  readSeedWithTransform<T, R>(
    filePath: string,
    transformFn: (data: T) => R,
  ): R[] {
    const rawData = this.readSeed<T>(filePath);
    return rawData.map(transformFn);
  }

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
