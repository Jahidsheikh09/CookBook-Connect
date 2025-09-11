// src/realtime/realtime.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { REDIS_PUB_SUB } from './redis-pubsub.provider';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(@Inject(REDIS_PUB_SUB) private pubsub: RedisPubSub) {}

  // event names
  public static EVENTS = {
    RATING_ADDED: 'ratingAdded',
    COMMENT_ADDED: 'commentAdded',
    RECIPE_CREATED: 'recipeCreated',
    FOLLOWED_USER_POSTED: 'followedUserPosted',
    ACTIVITY_FEED: 'activityFeed',
  };

  async publishRating(payload: any) {
    await this.pubsub.publish(RealtimeService.EVENTS.RATING_ADDED, {
      ratingAdded: payload,
    });
    this.logger.debug('Published ratingAdded');
  }

  async publishComment(payload: any) {
    await this.pubsub.publish(RealtimeService.EVENTS.COMMENT_ADDED, {
      commentAdded: payload,
    });
    this.logger.debug('Published commentAdded');
  }

  async publishRecipeCreated(payload: any) {
    await this.pubsub.publish(RealtimeService.EVENTS.RECIPE_CREATED, {
      recipeCreated: payload,
    });
    this.logger.debug('Published recipeCreated');
  }

  async publishFollowedUserPosted(payload: any) {
    await this.pubsub.publish(RealtimeService.EVENTS.FOLLOWED_USER_POSTED, {
      followedUserPosted: payload,
    });
  }

  async publishActivity(payload: any) {
    await this.pubsub.publish(RealtimeService.EVENTS.ACTIVITY_FEED, {
      activityFeed: payload,
    });
  }

  getPubSub(): RedisPubSub {
    return this.pubsub;
  }
}
