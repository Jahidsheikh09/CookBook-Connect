// src/recipes/recipes.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/parisma.service';
import { ElasticService } from '../elastic/elastic.service';
import { CreateRecipeInput } from './dto/create-recipe.input';
import { UpdateRecipeInput } from './dto/update-recipe.input';
import { RatingInput } from './dto/rating.input';
import { CommentInput } from './dto/comment.input';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService, private elastic: ElasticService) {}

  private async enrichForIndex(recipeId: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: true, instructions: true, ratings: true, comments: true, author: true },
    });
    if (!recipe) return null;
    const avgRating = recipe.ratings.length ? recipe.ratings.reduce((s, r) => s + r.score, 0) / recipe.ratings.length : 0;
    return { ...recipe, avgRating, commentCount: recipe.comments.length };
  }

  async create(userId: string, input: CreateRecipeInput) {
    const recipe = await this.prisma.recipe.create({
      data: { title: input.title, description: input.description ?? null, authorId: userId },
    });

    if (input.ingredients && input.ingredients.length) {
      await this.prisma.recipeIngredient.createMany({
        data: input.ingredients.map(i => ({ recipeId: recipe.id, name: i.name, quantity: i.quantity ?? null })),
      });
    }

    if (input.instructions && input.instructions.length) {
      await this.prisma.instruction.createMany({
        data: input.instructions.map(ins => ({ recipeId: recipe.id, stepNumber: ins.stepNumber, text: ins.text })),
      });
    }

    const toIndex = await this.enrichForIndex(recipe.id);
    if (toIndex) await this.elastic.indexRecipe(toIndex);

    return this.findById(recipe.id);
  }

  async update(recipeId: string, input: UpdateRecipeInput, userId?: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (userId && recipe.authorId !== userId) throw new ForbiddenException('Only author can update');

    await this.prisma.recipe.update({ where: { id: recipeId }, data: { title: input.title ?? undefined, description: input.description ?? undefined } });

    if (input.ingredients) {
      await this.prisma.recipeIngredient.deleteMany({ where: { recipeId } });
      if (input.ingredients.length) {
        await this.prisma.recipeIngredient.createMany({ data: input.ingredients.map(i => ({ recipeId, name: i.name, quantity: i.quantity ?? null })) });
      }
    }

    if (input.instructions) {
      await this.prisma.instruction.deleteMany({ where: { recipeId } });
      if (input.instructions.length) {
        await this.prisma.instruction.createMany({ data: input.instructions.map(ins => ({ recipeId, stepNumber: ins.stepNumber, text: ins.text })) });
      }
    }

    const toIndex = await this.enrichForIndex(recipeId);
    if (toIndex) await this.elastic.indexRecipe(toIndex);

    return this.findById(recipeId);
  }

  async delete(recipeId: string, userId?: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (userId && recipe.authorId !== userId) throw new ForbiddenException('Only author can delete this recipe');

    await this.prisma.comment.deleteMany({ where: { recipeId } });
    await this.prisma.rating.deleteMany({ where: { recipeId } });
    await this.prisma.instruction.deleteMany({ where: { recipeId } });
    await this.prisma.recipeIngredient.deleteMany({ where: { recipeId } });

    await this.prisma.recipe.delete({ where: { id: recipeId } });

    await this.elastic.deleteRecipeFromIndex(recipeId);

    return { success: true };
  }

  async findAll() {
    return this.prisma.recipe.findMany({
      include: {
        ingredients: true,
        instructions: { orderBy: { stepNumber: 'asc' } },
        ratings: true,
        comments: { include: { user: true }, orderBy: { createdAt: 'desc' } },
        author: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(recipeId: string) {
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
    return recipe;
  }

  async addRating(userId: string, input: RatingInput) {
    const recipeId = input.recipeId!;
    if (!recipeId) throw new BadRequestException('recipeId is required');
    if (input.score < 1 || input.score > 5) throw new BadRequestException('Score must be 1-5');

    const rating = await this.prisma.rating.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      update: { score: input.score, review: input.review ?? null },
      create: { userId, recipeId, score: input.score, review: input.review ?? null },
    });

    // reindex recipe
    const toIndex = await this.enrichForIndex(recipeId);
    if (toIndex) await this.elastic.indexRecipe(toIndex);

    return rating;
  }

  async addComment(userId: string, input: CommentInput) {
    const recipeId = input.recipeId!;
    if (!recipeId) throw new BadRequestException('recipeId is required');

    const comment = await this.prisma.comment.create({
      data: { userId, recipeId, content: input.content },
      include: { user: true },
    });

    // reindex recipe
    const toIndex = await this.enrichForIndex(recipeId);
    if (toIndex) await this.elastic.indexRecipe(toIndex);

    return comment;
  }
}
