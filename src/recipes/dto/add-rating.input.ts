import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class AddRatingInput {
  @Field(() => String)
  recipeId!: string;

  @Field(() => Int)
  score!: number;

  @Field(() => String, { nullable: true })
  review?: string;
}
