import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/parisma.module';
import { ElasticModule } from '../elastic/elastic.module';


@Module({
imports: [PrismaModule, ElasticModule],
controllers: [HealthController],
})
export class HealthModule {}