// src/ai/dto/ai-suggestion.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AiSuggestionInput {
  @Field({ nullable: true })
  recipeId?: string; // pass a recipe id to analyze DB recipe

  @Field(() => [String], { nullable: true })
  ingredients?: string[]; // alternative input

  @Field({ nullable: true })
  dietaryRestriction?: string; // e.g. "vegan", "gluten-free", "nut allergy"

  @Field({ nullable: true })
  requestType?: string; // optional hint: "improve", "substitute", "tips", "pairing"
}
