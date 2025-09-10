import { InputType, Field } from '@nestjs/graphql';
import { IngredientInput } from './ingredient.input';
import { InstructionInput } from './instruction.input';

@InputType()
export class CreateRecipeInput {
  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [IngredientInput])
  ingredients!: IngredientInput[];

  @Field(() => [InstructionInput])
  instructions!: InstructionInput[];
}
