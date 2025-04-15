import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HashService } from './hash.service';

@Injectable()
export class BcryptService implements HashService {
  async hash(data: string | Buffer): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(data, salt);
  }

  compare(data: string | Buffer, hashed: string): Promise<boolean> {
    return bcrypt.compare(data, hashed);
  }
}
