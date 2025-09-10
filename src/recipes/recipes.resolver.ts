// src/recipes/recipes.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { RecipesService } from './recipes.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../common/decorators';
import { CreateRecipeInput } from './dto/create-recipe.input';
import { UpdateRecipeInput } from './dto/update-recipe.input';
import { RatingInput } from './dto/rating.input';
import { CommentInput } from './dto/comment.input';

@Resolver()
export class RecipesResolver {
  constructor(private recipesService: RecipesService) {}

  @Query(() => [Object])
  recipes() {
    return this.recipesService.findAll();
  }

  @Query(() => Object)
  recipe(@Args('id') id: string) {
    return this.recipesService.findById(id);
  }

  @Mutation(() => Object)
  @UseGuards(GqlAuthGuard)
  createRecipe(@CurrentUser() user: any, @Args('input') input: CreateRecipeInput) {
    return this.recipesService.create(user.id, input);
  }

  @Mutation(() => Object)
  @UseGuards(GqlAuthGuard)
  updateRecipe(@Args('id') id: string, @Args('input') input: UpdateRecipeInput, @CurrentUser() user?: any) {
    return this.recipesService.update(id, input, user?.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteRecipe(@Args('id') id: string, @CurrentUser() user?: any) {
    await this.recipesService.delete(id, user?.id);
    return true;
  }

  @Mutation(() => Object)
  @UseGuards(GqlAuthGuard)
  addRating(@CurrentUser() user: any, @Args('input') input: RatingInput) {
    return this.recipesService.addRating(user.id, input);
  }

  @Mutation(() => Object)
  @UseGuards(GqlAuthGuard)
  addComment(@CurrentUser() user: any, @Args('input') input: CommentInput) {
    return this.recipesService.addComment(user.id, input);
  }
}
