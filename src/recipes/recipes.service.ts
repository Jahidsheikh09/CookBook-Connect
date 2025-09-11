// src/recipes/recipes.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticService } from '../elastic/elastic.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateRecipeInput } from './dto/create-recipe.input';
import { UpdateRecipeInput } from './dto/update-recipe.input';
import { RatingInput } from './dto/rating.input';
import { CommentInput } from './dto/comment.input';
import { RecipeType } from './dto/recipe.type';

@Injectable()
export class RecipesService {
  constructor(
    private prisma: PrismaService,
    private elastic: ElasticService,
    private realtime: RealtimeService,
  ) {}

  // ---------------- Utility: enrich recipe for indexing ----------------
  private async enrichForIndex(recipeId: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
        instructions: true,
        ratings: true,
        comments: true,
        author: true,
      },
    });
    if (!recipe) return null;

    const avgRating = recipe.ratings.length
      ? recipe.ratings.reduce(
          (sum: number, rating: { score: number }) => sum + rating.score,
          0,
        ) / recipe.ratings.length
      : 0;

    return { ...recipe, avgRating, commentCount: recipe.comments.length };
  }

  // ---------------- CREATE RECIPE ----------------
  async create(userId: string, input: CreateRecipeInput) {
    if (!input.title) {
      throw new BadRequestException('title is required');
    }

    const recipe = await this.prisma.recipe.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        authorId: userId,
        ingredients: input.ingredients?.length
          ? {
              create: input.ingredients.map((i: any) => {
                if (typeof i === 'string') {
                  return { name: i, quantity: null };
                }
                return { name: i.name, quantity: i.quantity ?? null };
              }),
            }
          : undefined,
        instructions: input.instructions?.length
          ? {
              create: input.instructions.map((ins: any, idx: number) => {
                if (typeof ins === 'string') {
                  return { stepNumber: idx + 1, text: ins };
                }
                return {
                  stepNumber: ins.stepNumber ?? idx + 1,
                  text: ins.text,
                };
              }),
            }
          : undefined,
      },
    });

    const toIndex = await this.enrichForIndex(recipe.id);
    if (toIndex) {
      await this.elastic.indexRecipe(toIndex);
      await this.realtime.publishRecipeCreated({ recipe: toIndex });
      await this.realtime.publishActivity({
        type: 'recipe_created',
        userId,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        timestamp: new Date().toISOString(),
      });

      const followers = await this.prisma.follow.findMany({
        where: { followingId: userId },
      });
      for (const f of followers) {
        await this.realtime.publishFollowedUserPosted({
          followerId: f.followerId,
          authorId: userId,
          recipeId: recipe.id,
          recipeTitle: recipe.title,
        });
      }
    }

    return this.findById(recipe.id);
  }

  // ---------------- UPDATE RECIPE ----------------
  async update(recipeId: string, input: UpdateRecipeInput, userId?: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (userId && recipe.authorId !== userId)
      throw new ForbiddenException('Only author can update');

    await this.prisma.recipe.update({
      where: { id: recipeId },
      data: {
        title: input.title ?? undefined,
        description: input.description ?? undefined,
      },
    });

    if (input.ingredients) {
      await this.prisma.recipeIngredient.deleteMany({ where: { recipeId } });
      if (input.ingredients.length) {
        await this.prisma.recipeIngredient.createMany({
          data: input.ingredients.map((i) => ({
            recipeId,
            name: i.name,
            quantity: i.quantity ?? null,
          })),
        });
      }
    }

    if (input.instructions) {
      await this.prisma.instruction.deleteMany({ where: { recipeId } });
      if (input.instructions.length) {
        await this.prisma.instruction.createMany({
          data: input.instructions.map((ins) => ({
            recipeId,
            stepNumber: ins.stepNumber,
            text: ins.text,
          })),
        });
      }
    }

    const toIndex = await this.enrichForIndex(recipeId);
    if (toIndex) await this.elastic.indexRecipe(toIndex);

    return this.findById(recipeId);
  }

  // ---------------- DELETE RECIPE ----------------
  async delete(recipeId: string, userId?: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (userId && recipe.authorId !== userId)
      throw new ForbiddenException('Only author can delete this recipe');

    await this.prisma.comment.deleteMany({ where: { recipeId } });
    await this.prisma.rating.deleteMany({ where: { recipeId } });
    await this.prisma.instruction.deleteMany({ where: { recipeId } });
    await this.prisma.recipeIngredient.deleteMany({ where: { recipeId } });
    await this.prisma.recipe.delete({ where: { id: recipeId } });

    await this.elastic.deleteRecipeFromIndex(recipeId);

    return { success: true };
  }

  // ---------------- FIND ----------------
  async findAll(): Promise<RecipeType[]> {
    const recipes = await this.prisma.recipe.findMany({
      include: {
        ingredients: true,
        instructions: { orderBy: { stepNumber: 'asc' } },
        ratings: true,
        comments: { include: { user: true }, orderBy: { createdAt: 'desc' } },
        author: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return recipes.map((r: any) => ({
      ...r,
      author: r.author
        ? {
            id: r.author.id,
            email: r.author.email,
            name: r.author.name ?? null,
            avatar: r.author.avatar ?? null,
            createdAt: r.author.createdAt,
          }
        : null,
      comments: r.comments.map((c: any) => ({
        ...c,
        user: {
          id: c.user.id,
          email: c.user.email,
          name: c.user.name ?? null,
          avatar: c.user.avatar ?? null,
          createdAt: c.user.createdAt,
        },
      })),
    })) as RecipeType[];
  }

  async findById(recipeId: string): Promise<RecipeType> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
        instructions: { orderBy: { stepNumber: 'asc' } },
        ratings: true,
        comments: { include: { user: true }, orderBy: { createdAt: 'desc' } },
        author: true,
      },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');

    return {
      ...recipe,
      author: recipe.author
        ? {
            id: recipe.author.id,
            email: recipe.author.email,
            name: recipe.author.name ?? null,
            avatar: recipe.author.avatar ?? null,
            createdAt: recipe.author.createdAt,
          }
        : null,
      comments: recipe.comments.map((c: any) => ({
        ...c,
        user: {
          id: c.user.id,
          email: c.user.email,
          name: c.user.name ?? null,
          avatar: c.user.avatar ?? null,
          createdAt: c.user.createdAt,
        },
      })),
    } as RecipeType;
  }

  // ---------------- ADD RATING ----------------
  async addRating(userId: string, input: RatingInput) {
    const recipeId = input.recipeId!;
    if (!recipeId) throw new BadRequestException('recipeId is required');
    if (input.score < 1 || input.score > 5)
      throw new BadRequestException('Score must be 1-5');

    const rating = await this.prisma.rating.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      update: { score: input.score, review: input.review ?? null },
      create: {
        userId,
        recipeId,
        score: input.score,
        review: input.review ?? null,
      },
    });

    const toIndex = await this.enrichForIndex(recipeId);
    if (toIndex) await this.elastic.indexRecipe(toIndex);

    await this.realtime.publishRating({
      userId,
      recipeId,
      score: input.score,
      review: input.review ?? null,
      timestamp: new Date().toISOString(),
    });

    return rating;
  }

  // ---------------- ADD COMMENT ----------------
  async addComment(userId: string, input: CommentInput) {
    const recipeId = input.recipeId!;
    if (!recipeId) throw new BadRequestException('recipeId is required');

    const comment = await this.prisma.comment.create({
      data: { userId, recipeId, content: input.content },
      include: { user: true },
    });

    const toIndex = await this.enrichForIndex(recipeId);
    if (toIndex) await this.elastic.indexRecipe(toIndex);

    await this.realtime.publishComment({
      userId,
      recipeId,
      content: input.content,
      commentId: comment.id,
      timestamp: comment.createdAt,
    });

    return {
      ...comment,
      user: {
        id: comment.user.id,
        email: comment.user.email,
        name: comment.user.name ?? null,
        avatar: comment.user.avatar ?? null,
        createdAt: comment.user.createdAt,
      },
    };
  }

  // ---------------- SEARCH ----------------
  async search(query: string): Promise<RecipeType[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        ingredients: true,
        instructions: { orderBy: { stepNumber: 'asc' } },
        ratings: true,
        comments: { include: { user: true }, orderBy: { createdAt: 'desc' } },
        author: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped: RecipeType[] = recipes.map((r: any) => {
      const mappedAuthor = r.author
        ? {
            id: r.author.id,
            email: r.author.email,
            name: r.author.name ?? null,
            avatar: r.author.avatar ?? null,
            createdAt: r.author.createdAt,
          }
        : null;

      const mappedComments = (r.comments ?? []).map((c: any) => ({
        id: c.id,
        userId: c.userId,
        recipeId: c.recipeId,
        content: c.content,
        createdAt: c.createdAt,
        user: c.user
          ? {
              id: c.user.id,
              email: c.user.email,
              name: c.user.name ?? null,
              avatar: c.user.avatar ?? null,
              createdAt: c.user.createdAt,
            }
          : null,
      }));

      return {
        id: r.id,
        title: r.title,
        description: r.description ?? null,
        ingredients: r.ingredients as any,
        instructions: r.instructions as any,
        ratings: r.ratings as any,
        comments: mappedComments as any,
        author: mappedAuthor as any,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      } as RecipeType;
    });

    return mapped;
  }
}
