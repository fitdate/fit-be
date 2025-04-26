import { Module } from '@nestjs/common';
import { FestivalService } from './festival.service';
import { FestivalController } from './festival.controller';
import { LocationModule } from '../location/location.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NaverSearchService } from './naver-search.service';
@Module({
  imports: [
    LocationModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [FestivalController],
  providers: [FestivalService, NaverSearchService],
  exports: [FestivalService],
})
export class FestivalModule {}
