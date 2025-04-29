import { Controller } from '@nestjs/common';
import { InterestLocationService } from './interest-location.service';

@Controller('interest-location')
export class InterestLocationController {
  constructor(
    private readonly interestLocationService: InterestLocationService,
  ) {}
}
