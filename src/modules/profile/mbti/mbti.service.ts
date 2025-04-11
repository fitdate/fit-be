import { Injectable } from '@nestjs/common';
import { CreateMbtiDto } from './dto/create-mbti.dto';
import { UpdateMbtiDto } from './dto/update-mbti.dto';

@Injectable()
export class MbtiService {
  create(createMbtiDto: CreateMbtiDto) {
    return 'This action adds a new mbti';
  }

  findAll() {
    return `This action returns all mbti`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mbti`;
  }

  update(id: number, updateMbtiDto: UpdateMbtiDto) {
    return `This action updates a #${id} mbti`;
  }

  remove(id: number) {
    return `This action removes a #${id} mbti`;
  }
}
