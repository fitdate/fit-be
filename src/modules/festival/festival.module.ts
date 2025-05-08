import { Module } from '@nestjs/common';
import { FestivalService } from './festival.service';
import { FestivalController } from './festival.controller';
import { LocationModule } from '../location/location.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NaverSearchService } from './service/naver-search.service';
import { RedisService } from '../redis/redis.service';
import { UserRequestFestivalService } from './service/user-request-festival.service';
import { UserModule } from '../user/user.module';
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
    UserModule,
  ],
  controllers: [FestivalController],
  providers: [
    FestivalService,
    NaverSearchService,
    RedisService,
    UserRequestFestivalService,
  ],
  exports: [FestivalService, UserRequestFestivalService],
})
export class FestivalModule {}
