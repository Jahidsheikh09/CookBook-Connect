// src/recipes/dto/create-recipe.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class IngredientInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  quantity?: string;
}

@InputType()
export class InstructionInput {
  @Field()
  text!: string;

  @Field({ nullable: true })
  stepNumber?: number;
}

@InputType()
export class CreateRecipeInput {
  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [IngredientInput], { nullable: 'itemsAndList' })
  ingredients?: IngredientInput[];

  @Field(() => [InstructionInput], { nullable: 'itemsAndList' })
  instructions?: InstructionInput[];
}
