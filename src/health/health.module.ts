import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ElasticModule } from '../elastic/elastic.module';


@Module({
imports: [PrismaModule, ElasticModule],
controllers: [HealthController],
})
export class HealthModule {}