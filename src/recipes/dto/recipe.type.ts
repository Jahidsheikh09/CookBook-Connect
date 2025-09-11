import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class UserType {
  @Field(() => ID) id!: string;
  @Field() email!: string;
  @Field({ nullable: true }) name?: string | null;
  @Field({ nullable: true }) avatar?: string | null;
  @Field() createdAt!: Date;
}

@ObjectType()
export class RecipeIngredientType {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field({ nullable: true }) quantity?: string | null;
  @Field({ nullable: true }) unit?: string | null;
}

@ObjectType()
export class InstructionType {
  @Field(() => ID) id!: string;
  @Field() text!: string;
  @Field(() => Int) stepNumber!: number;
}

@ObjectType()
export class RatingType {
  @Field(() => ID) id!: string;
  @Field() userId!: string;
  @Field() recipeId!: string;
  @Field(() => Int) score!: number;
  @Field({ nullable: true }) review?: string | null;
  @Field() createdAt!: Date;
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
  @Field({ nullable: true }) description?: string | null;
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
