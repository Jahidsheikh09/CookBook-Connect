import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class InstructionInput {
  @Field(() => Int)
  stepNumber!: number;    // required

  @Field()
  text!: string;          // required
}
