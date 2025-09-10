import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PrismaModule } from './prisma/parisma.module';
import { ElasticModule } from './elastic/elastic.module';
import { RecipesModule } from './recipes/recipes.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtModule } from '@nestjs/jwt';   // 👈 ADD THIS

import { SearchResolver } from './search/search.resolver';

@Module({
  imports: [
    JwtModule.register({
      global: true, // 👈 makes it available everywhere
      secret: process.env.JWT_SECRET || 'supersecret',
      signOptions: { expiresIn: '1h' },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
    PrismaModule,
    ElasticModule,
    AuthModule,
    UsersModule,
    RecipesModule,
  ],
  providers: [SearchResolver],
})
export class AppModule {}
