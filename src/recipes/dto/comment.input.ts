import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CommentInput {
  @Field()
  recipeId!: string;

  @Field()
  content!: string;
}
