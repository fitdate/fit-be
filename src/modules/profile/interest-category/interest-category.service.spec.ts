import { Test, TestingModule } from '@nestjs/testing';
import { InterestCategoryService } from './interest-category.service';

describe('InterestCategoryService', () => {
  let service: InterestCategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InterestCategoryService],
    }).compile();

    service = module.get<InterestCategoryService>(InterestCategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
