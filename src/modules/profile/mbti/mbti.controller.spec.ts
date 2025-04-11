import { Test, TestingModule } from '@nestjs/testing';
import { MbtiController } from './mbti.controller';
import { MbtiService } from './mbti.service';

describe('MbtiController', () => {
  let controller: MbtiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MbtiController],
      providers: [MbtiService],
    }).compile();

    controller = module.get<MbtiController>(MbtiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
