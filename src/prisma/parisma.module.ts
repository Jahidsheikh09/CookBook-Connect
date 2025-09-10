import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/parisma.service';

@Global() // makes PrismaService available everywhere without re-import
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
