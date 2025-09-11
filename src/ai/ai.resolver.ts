// src/ai/ai.resolver.ts
import { Resolver, Query, Args } from '@nestjs/graphql';
import { AiService } from './ai.service';
import { AiSuggestion } from './dto/ai-suggestion.type';
import { AiSuggestionInput } from './dto/ai-suggestion.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../common/decorators';

@Resolver()
export class AiResolver {
  constructor(private ai: AiService) {}

  // Suggest improvements for a recipe
  @Query(() => AiSuggestion)
  @UseGuards(GqlAuthGuard)
  async aiSuggestImprovements(
    @CurrentUser() user: any,
    @Args('input') input: AiSuggestionInput,
  ) {
    const res = await this.ai.suggestImprovements(
      user?.id,
      input.recipeId,
      input.ingredients,
    );
    return res;
  }

  @Query(() => AiSuggestion)
  @UseGuards(GqlAuthGuard)
  async aiSuggestSubstitutions(
    @CurrentUser() user: any,
    @Args('ingredients', { type: () => [String] }) ingredients: string[],
    @Args('dietary', { nullable: true }) dietary?: string,
  ) {
    const res = await this.ai.suggestSubstitutions(
      user?.id,
      ingredients,
      dietary,
    );
    return res;
  }

  @Query(() => AiSuggestion)
  @UseGuards(GqlAuthGuard)
  async aiCookingTips(
    @CurrentUser() user: any,
    @Args('recipeId', { nullable: true }) recipeId?: string,
    @Args('complexity', { nullable: true }) complexity?: string,
  ) {
    return this.ai.suggestCookingTips(user?.id, recipeId, complexity as any);
  }

  @Query(() => AiSuggestion)
  @UseGuards(GqlAuthGuard)
  async aiPairings(
    @CurrentUser() user: any,
    @Args('recipeId', { nullable: true }) recipeId?: string,
  ) {
    try {
      return await this.ai.suggestPairings(user?.id, recipeId);
    } catch (err) {
      return {
        id: `error-${Date.now()}`,
        summary: 'AI unavailable',
        details: 'AI service currently unreachable. Try again later.',
        source: 'system',
        createdAt: new Date().toISOString(),
      };
    }
  }
}
