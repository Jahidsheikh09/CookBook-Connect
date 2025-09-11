// src/realtime/notifications.resolver.ts
import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { REDIS_PUB_SUB } from './redis-pubsub.provider';
import { RealtimeService } from './realtime.service';
import { withFilter } from 'graphql-subscriptions';

@Resolver()
export class NotificationsResolver {
  constructor(
    private realtime: RealtimeService,
    @Inject(REDIS_PUB_SUB) private pubsub: RedisPubSub,
  ) {}

  // Subscription when a new rating is added (all clients)
  @Subscription(() => Object, {
    name: 'ratingAdded',
    // filter can be added to only send to users interested
  })
  ratingAdded() {
    return this.pubsub.asyncIterator(RealtimeService.EVENTS.RATING_ADDED);
  }

  // Subscription when new comment added
  @Subscription(() => Object, {
    name: 'commentAdded',
  })
  commentAdded() {
    return this.pubsub.asyncIterator(RealtimeService.EVENTS.COMMENT_ADDED);
  }

  // Subscription for recipe created (optionally filter by authorId)
  @Subscription(() => Object, {
    name: 'recipeCreated',
    // you can add a filter to only return recipes from users you follow etc.
    // filter: (payload, variables) => payload.recipeCreated.authorId === variables.authorId
  })
  recipeCreated(@Args('authorId', { nullable: true }) authorId?: string) {
    // If client passes authorId, they only want that author's recipes — filtering can be handled in code below
    if (!authorId) {
      return this.pubsub.asyncIterator(RealtimeService.EVENTS.RECIPE_CREATED);
    }
    // wrap iterator with filter in user code using 'withFilter' in graphql-tools if needed.
    return this.pubsub.asyncIterator(RealtimeService.EVENTS.RECIPE_CREATED);
  }

  // Activity feed (global or per-user)
  @Subscription(() => Object, { name: 'activityFeed' })
  activityFeed() {
    return this.pubsub.asyncIterator(RealtimeService.EVENTS.ACTIVITY_FEED);
  }

  @Subscription(() => Object, {
    name: 'followedUserPosted',
    filter: (payload, variables) => {
      // payload.followedUserPosted.followerId === variables.userId
      return (
        payload.followedUserPosted &&
        payload.followedUserPosted.followerId === variables.userId
      );
    },
  })
  followedUserPosted(@Args('userId') userId: string) {
    return this.pubsub.asyncIterator('followedUserPosted');
  }
}
