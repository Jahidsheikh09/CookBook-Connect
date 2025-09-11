import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { RecipesService } from './recipes.service';
import { RecipeType, RatingType, CommentType } from './dto/recipe.type';
import { CreateRecipeInput } from './dto/create-recipe.input';
import { UpdateRecipeInput } from './dto/update-recipe.input';
import { RatingInput } from './dto/rating.input';
import { CommentInput } from './dto/comment.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../common/decorators';
import { SearchRecipesResult } from './dto/search-recipes.output';

@Resolver(() => RecipeType)
export class RecipesResolver {
  constructor(private readonly recipesService: RecipesService) {}

  @Query(() => [RecipeType])
  async recipes() {
    return this.recipesService.findAll();
  }

  @Query(() => RecipeType)
  async recipe(@Args('id') id: string) {
    return this.recipesService.findById(id);
  }

  @Query(() => SearchRecipesResult, { name: 'searchRecipes' })
  async searchRecipes(@Args('query', { type: () => String }) query: string) {
    return this.recipesService.search(query);
  }

  @Mutation(() => RecipeType)
  @UseGuards(GqlAuthGuard)
  async createRecipe(
    @CurrentUser() user: any,
    @Args('input') input: CreateRecipeInput,
  ) {
    return this.recipesService.create(user.id, input);
  }

  @Mutation(() => RecipeType)
  @UseGuards(GqlAuthGuard)
  async updateRecipe(
    @Args('id') id: string,
    @Args('input') input: UpdateRecipeInput,
    @CurrentUser() user?: any,
  ) {
    return this.recipesService.update(id, input, user?.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteRecipe(@Args('id') id: string, @CurrentUser() user?: any) {
    await this.recipesService.delete(id, user?.id);
    return true;
  }

  @Mutation(() => RatingType)
  @UseGuards(GqlAuthGuard)
  async addRating(@CurrentUser() user: any, @Args('input') input: RatingInput) {
    return this.recipesService.addRating(user.id, input);
  }

  @Mutation(() => CommentType)
  @UseGuards(GqlAuthGuard)
  async addComment(
    @CurrentUser() user: any,
    @Args('input') input: CommentInput,
  ) {
    return this.recipesService.addComment(user.id, input);
  }
}
