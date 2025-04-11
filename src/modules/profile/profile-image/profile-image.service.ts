import { Injectable } from '@nestjs/common';
import { CreateProfileImageDto } from './dto/create-profile-image.dto';
import { UpdateProfileImageDto } from './dto/update-profile-image.dto';

@Injectable()
export class ProfileImageService {
  create(createProfileImageDto: CreateProfileImageDto) {
    return 'This action adds a new profileImage';
  }

  findAll() {
    return `This action returns all profileImage`;
  }

  findOne(id: number) {
    return `This action returns a #${id} profileImage`;
  }

  update(id: number, updateProfileImageDto: UpdateProfileImageDto) {
    return `This action updates a #${id} profileImage`;
  }

  remove(id: number) {
    return `This action removes a #${id} profileImage`;
  }
}
