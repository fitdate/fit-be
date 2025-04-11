import { Injectable } from '@nestjs/common';
import { CreateIntroductionDto } from './dto/create-introduction.dto';
import { UpdateIntroductionDto } from './dto/update-introduction.dto';

@Injectable()
export class IntroductionService {
  create(createIntroductionDto: CreateIntroductionDto) {
    return 'This action adds a new introduction';
  }

  findAll() {
    return `This action returns all introduction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} introduction`;
  }

  update(id: number, updateIntroductionDto: UpdateIntroductionDto) {
    return `This action updates a #${id} introduction`;
  }

  remove(id: number) {
    return `This action removes a #${id} introduction`;
  }
}
