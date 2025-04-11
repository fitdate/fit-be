import { Test, TestingModule } from '@nestjs/testing';
import { ProfileImageController } from './profile-image.controller';
import { ProfileImageService } from './profile-image.service';

describe('ProfileImageController', () => {
  let controller: ProfileImageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileImageController],
      providers: [ProfileImageService],
    }).compile();

    controller = module.get<ProfileImageController>(ProfileImageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
