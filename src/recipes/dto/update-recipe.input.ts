import { InputType, Field } from '@nestjs/graphql';
import { IngredientInput } from './ingredient.input';
import { InstructionInput } from './instruction.input';

@InputType()
export class UpdateRecipeInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [IngredientInput], { nullable: true })
  ingredients?: IngredientInput[];

  @Field(() => [InstructionInput], { nullable: true })
  instructions?: InstructionInput[];
}
