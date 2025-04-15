import { Injectable } from '@nestjs/common';
import { CreateInterestLocationDto } from './dto/create-many-interest-location.dto';
import { UpdateInterestLocationDto } from './dto/update-interest-location.dto';

@Injectable()
export class InterestLocationService {
  create(createInterestLocationDto: CreateInterestLocationDto) {
    return 'This action adds a new interestLocation';
  }

  findAll() {
    return `This action returns all interestLocation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} interestLocation`;
  }

  update(id: number, updateInterestLocationDto: UpdateInterestLocationDto) {
    return `This action updates a #${id} interestLocation`;
  }

  remove(id: number) {
    return `This action removes a #${id} interestLocation`;
  }
}
