import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipesResolver } from './recipes.resolver';
import { PrismaService } from '../prisma/parisma.service';
import { AuthModule } from '../auth/auth.module'; // Required for GqlAuthGuard

@Module({
  imports: [AuthModule], // import AuthModule for authentication/guards
  providers: [
    RecipesService,
    RecipesResolver,
    PrismaService, // Inject PrismaService for DB access
  ],
  exports: [RecipesService],
})
export class RecipesModule {}
