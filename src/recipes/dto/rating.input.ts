import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class RatingInput {
  @Field()
  recipeId!: string;

  @Field(() => Int)
  score!: number;

  @Field({ nullable: true })
  review?: string;
}
