import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipesResolver } from './recipes.resolver';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticService } from '../elastic/elastic.service';
import { RealtimeService } from '../realtime/realtime.service';

@Module({
  providers: [RecipesService, RecipesResolver, PrismaService, ElasticService, RealtimeService],
})
export class RecipesModule {}
