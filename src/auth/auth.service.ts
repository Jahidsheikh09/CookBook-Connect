// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/parisma.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,  // ✅ Now available
    private prisma: PrismaService,
  ) {}

  async signToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return this.jwtService.signAsync(payload);
  }
}
