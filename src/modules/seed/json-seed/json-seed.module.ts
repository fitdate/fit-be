import { Module } from '@nestjs/common';
import { JsonSeedService } from './json-seed.service';

@Module({
  providers: [JsonSeedService],
  exports: [JsonSeedService],
})
export class JsonSeedModule {}
