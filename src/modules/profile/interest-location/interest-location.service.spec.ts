import { Test, TestingModule } from '@nestjs/testing';
import { InterestLocationService } from './interest-location.service';

describe('InterestLocationService', () => {
  let service: InterestLocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InterestLocationService],
    }).compile();

    service = module.get<InterestLocationService>(InterestLocationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
