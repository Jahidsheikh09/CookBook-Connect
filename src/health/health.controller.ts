import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/parisma.service';
import { ElasticService } from '../elastic/elastic.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private elastic: ElasticService,
  ) {}

  @Get()
  async check() {
    const checks: any = {
      server: { status: 'ok' },
    };

    // Check DB
    try {
      // simple and cheap DB check
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok' };
    } catch (err) {
      checks.database = { status: 'down', error: (err as Error).message };
    }

    // Check Elasticsearch
    try {
      const ok = await this.elastic.isHealthy();
      checks.elasticsearch = { status: ok ? 'ok' : 'down' };
    } catch (err) {
      checks.elasticsearch = { status: 'down', error: (err as Error).message };
    }

    const overall = Object.values(checks).every((c: any) => c.status === 'ok');
    return { status: overall ? 'ok' : 'degraded', checks };
  }
}
