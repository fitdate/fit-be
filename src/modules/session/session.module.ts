import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { RedisModule } from '../redis/redis.module';
import { SessionGateway } from './session.gateway';
import { JwtModule } from '@nestjs/jwt';
@Module({
  imports: [RedisModule, JwtModule],
  providers: [SessionService, SessionGateway],
  exports: [SessionService],
})
export class SessionModule {}
