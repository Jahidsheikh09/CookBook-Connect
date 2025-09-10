import { Resolver, Mutation, Args, ObjectType, Field } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { BadRequestException } from '@nestjs/common';

@ObjectType()
class AuthPayload {
  @Field()
  accessToken!: string;
}

@Resolver()
export class AuthResolver {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Mutation(() => AuthPayload)
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    const user = await this.authService.validateUser(email, password);
    if (!user) throw new BadRequestException('Invalid credentials');
    const token = await this.authService.login({
      id: user.id,
      email: user.email,
    });
    return { accessToken: token.accessToken };
  }

  @Mutation(() => String)
  async register(
    @Args('email') email: string,
    @Args('password') password: string,
    @Args('name', { nullable: true }) name?: string,
  ) {
    const user = await this.authService.register(email, password, name);
    return user.id;
  }
}
