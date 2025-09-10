// src/search/search.resolver.ts
import { Resolver, Query, Args } from '@nestjs/graphql';
import { ElasticService } from '../elastic/elastic.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql-auth.guard';

@Resolver()
export class SearchResolver {
  constructor(private elastic: ElasticService) {}

  @Query(() => [Object], { name: 'searchRecipes' })
  async searchRecipes(
    @Args('q', { nullable: true }) q?: string,
    @Args('ingredients', { type: () => [String], nullable: true }) ingredients?: string[],
    @Args('cuisine', { nullable: true }) cuisine?: string,
    @Args('difficulty', { nullable: true }) difficulty?: string,
    @Args('minTime', { nullable: true }) minTime?: number,
    @Args('maxTime', { nullable: true }) maxTime?: number,
    @Args('sortBy', { nullable: true }) sortBy?: 'relevance' | 'rating' | 'newest',
    @Args('page', { nullable: true }) page?: number,
    @Args('perPage', { nullable: true }) perPage?: number,
    @Args('userId', { nullable: true }) userId?: string,
  ) {
    const res = await this.elastic.searchRecipes({
      q,
      ingredients,
      cuisine,
      difficulty,
      cookingTimeMin: minTime,
      cookingTimeMax: maxTime,
      sortBy: sortBy as any,
      page,
      perPage,
    });

    // record search analytics (fire-and-forget)
    this.elastic.recordSearchEvent({ userId, query: q, ingredients, timestamp: new Date().toISOString() }).catch(() => {});

    return res;
  }

  @Query(() => [String], { name: 'autocompleteIngredient' })
  async autocompleteIngredient(@Args('prefix') prefix: string) {
    return this.elastic.autocompleteIngredient(prefix);
  }

  // "cook with" - returns recipes that match all provided ingredients
  @Query(() => [Object], { name: 'cookWith' })
  async cookWith(@Args({ name: 'ingredients', type: () => [String] }) ingredients: string[], @Args('limit', { nullable: true }) limit?: number) {
    // Use searchRecipes with ingredients only and sort by rating
    const res = await this.elastic.searchRecipes({ ingredients, sortBy: 'rating', page: 1, perPage: limit ?? 20 });
    return res;
  }
}
