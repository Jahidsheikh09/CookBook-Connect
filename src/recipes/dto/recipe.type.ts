import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class UserType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  avatar?: string | null;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class RecipeIngredientType {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) quantity?: string | null;
  @Field(() => String, { nullable: true }) unit?: string | null;
}

@ObjectType()
export class InstructionType {
  @Field(() => ID) id!: string;
  @Field() text!: string;
  @Field(() => Int) stepNumber!: number;
}

@ObjectType()
export class RatingType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => String)
  recipeId!: string;

  @Field(() => Int)
  score!: number;

  @Field(() => String, { nullable: true })
  review?: string | null;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class CommentType {
  @Field(() => ID) id!: string;
  @Field() userId!: string;
  @Field() recipeId!: string;
  @Field() content!: string;
  @Field() createdAt!: Date;
  @Field(() => UserType, { nullable: true }) user?: UserType | null;
}

@ObjectType()
export class RecipeType {
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => [RecipeIngredientType], { nullable: 'itemsAndList' })
  ingredients?: RecipeIngredientType[];
  @Field(() => [InstructionType], { nullable: 'itemsAndList' })
  instructions?: InstructionType[];
  @Field(() => [RatingType], { nullable: 'itemsAndList' })
  ratings?: RatingType[];
  @Field(() => [CommentType], { nullable: 'itemsAndList' })
  comments?: CommentType[];
  @Field(() => UserType, { nullable: true }) author?: UserType | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}

@ObjectType()
export class SearchRecipesResult {
  @Field(() => Int)
  total!: number;

  @Field(() => [RecipeType])
  results!: RecipeType[];
}
