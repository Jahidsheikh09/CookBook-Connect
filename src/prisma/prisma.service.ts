import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect(); // Ensure Prisma connects when the module initializes
    console.log('Prisma connected');
  }

  async onModuleDestroy() {
    console.log('Prisma beforeExit hook triggered');
    await this.$disconnect(); // Ensure Prisma disconnects when the module is destroyed
  }
}
