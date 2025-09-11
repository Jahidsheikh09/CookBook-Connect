// src/ai/dto/ai-suggestion.type.ts
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class AiSuggestion {
  @Field()
  id!: string; // a cache key / id

  @Field()
  summary!: string;

  @Field({ nullable: true })
  details?: string;

  @Field({ nullable: true })
  source?: string; // e.g. "openai", "cached", etc.

  @Field({ nullable: true })
  createdAt?: string;
}
