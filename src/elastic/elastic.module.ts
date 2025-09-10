// src/elastic/elastic.module.ts
import { Module, Global } from '@nestjs/common';
import { ElasticService } from './elastic.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ElasticService],
  exports: [ElasticService],
})
export class ElasticModule {}
