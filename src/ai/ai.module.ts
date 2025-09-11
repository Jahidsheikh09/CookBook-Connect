// src/ai/ai.module.ts
import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiResolver } from './ai.resolver';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/parisma.module';
import { RedisModule } from '../redis/redis.module'; // optional helper (see note)

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, RedisModule],
  providers: [AiService, AiResolver],
  exports: [AiService],
})
export class AiModule {}
