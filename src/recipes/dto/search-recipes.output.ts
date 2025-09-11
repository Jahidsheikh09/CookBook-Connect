// src/recipes/dto/search-recipes-result.type.ts
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { RecipeType } from './recipe.type';

@ObjectType()
export class SearchRecipesResult {
  @Field(() => Int)
  total!: number;

  @Field(() => [RecipeType])
  results!: RecipeType[];
}
