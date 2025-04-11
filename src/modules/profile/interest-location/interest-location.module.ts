import { Module } from '@nestjs/common';
import { InterestLocationService } from './interest-location.service';
import { InterestLocationController } from './interest-location.controller';

@Module({
  controllers: [InterestLocationController],
  providers: [InterestLocationService],
})
export class InterestLocationModule {}
