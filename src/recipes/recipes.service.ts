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

    // re-fetch enriched doc and index
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
    if (userId && recipe.authorId !== userId) throw new ForbiddenException('Only author can delete');

    await this.prisma.comment.deleteMany({ where: { recipeId } });
    await this.prisma.rating.deleteMany({ where: { recipeId } });
    await this.prisma.instruction.deleteMany({ where: { recipeId } });
    await this.prisma.recipeIngredient.deleteMany({ where: { recipeId } });

    await this.prisma.recipe.delete({ where: { id: recipeId } });

    // remove from ES
    await this.elastic.deleteRecipeFromIndex(recipeId);

    return { success: true };
  }

  // existing findAll, findById, rate, comment functions...
}
