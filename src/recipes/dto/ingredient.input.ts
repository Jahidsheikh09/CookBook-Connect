import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class IngredientInput {
  @Field()
  name!: string;          // required

  @Field({ nullable: true })
  quantity?: string;      // optional
}
