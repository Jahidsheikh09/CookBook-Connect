import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/parisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const { password, ...safeUser } = user;
    return safeUser;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(
    id: string,
    data: { name?: string; bio?: string; avatar?: string },
  ) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId)
      throw new BadRequestException('Cannot follow yourself');
    try {
      return await this.prisma.follow.create({
        data: { followerId, followingId },
      });
    } catch (err) {
      throw new BadRequestException('Already following or invalid user');
    }
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return { success: true };
  }

  async getFollowersCount(userId: string) {
    return this.prisma.follow.count({ where: { followingId: userId } });
  }

  async getFollowingCount(userId: string) {
    return this.prisma.follow.count({ where: { followerId: userId } });
  }

  async topUsersByFollowers(limit = 10) {
    const users = await this.prisma.user.findMany(); // inferred type

    const withCounts = await Promise.all(
      users.map(async (u: (typeof users)[number]) => {
        const count = await this.getFollowersCount(u.id);
        const { password, ...rest } = u; // remove password safely
        return { ...rest, followersCount: count };
      }),
    );

    return withCounts
      .sort((a, b) => b.followersCount - a.followersCount)
      .slice(0, limit);
  }
}
