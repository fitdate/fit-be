import { Test, TestingModule } from '@nestjs/testing';
import { InterestCategoryController } from './interest-category.controller';
import { InterestCategoryService } from './interest-category.service';

describe('InterestCategoryController', () => {
  let controller: InterestCategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterestCategoryController],
      providers: [InterestCategoryService],
    }).compile();

    controller = module.get<InterestCategoryController>(InterestCategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
