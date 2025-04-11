import { Test, TestingModule } from '@nestjs/testing';
import { ProfileImageService } from './profile-image.service';

describe('ProfileImageService', () => {
  let service: ProfileImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfileImageService],
    }).compile();

    service = module.get<ProfileImageService>(ProfileImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
