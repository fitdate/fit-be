import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { RedisModule } from '../redis/redis.module';
import { SessionGateway } from './session.gateway';
import { JwtModule } from '@nestjs/jwt';
import { TokenModule } from '../token/token.module';
@Module({
  imports: [RedisModule, JwtModule, TokenModule],
  providers: [SessionService, SessionGateway],
  exports: [SessionService],
})
export class SessionModule {}
