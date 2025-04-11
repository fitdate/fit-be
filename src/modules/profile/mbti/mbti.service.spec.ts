import { Test, TestingModule } from '@nestjs/testing';
import { MbtiService } from './mbti.service';

describe('MbtiService', () => {
  let service: MbtiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MbtiService],
    }).compile();

    service = module.get<MbtiService>(MbtiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
