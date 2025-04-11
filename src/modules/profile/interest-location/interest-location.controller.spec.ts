import { Test, TestingModule } from '@nestjs/testing';
import { InterestLocationController } from './interest-location.controller';
import { InterestLocationService } from './interest-location.service';

describe('InterestLocationController', () => {
  let controller: InterestLocationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterestLocationController],
      providers: [InterestLocationService],
    }).compile();

    controller = module.get<InterestLocationController>(InterestLocationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
