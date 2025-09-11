import { Provider } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const REDIS_PUB_SUB = 'REDIS_PUB_SUB';

export const redisPubSubProvider = {
  provide: REDIS_PUB_SUB,
  useFactory: (config: ConfigService) => {
    const redisUrl =
      config.get<string>('REDIS_URL') || 'redis://localhost:6379';

    const options = {
      connection: {
        host: new URL(redisUrl).hostname,
        port: Number(new URL(redisUrl).port || 6379),
        // if your redis needs auth:
        // password: new URL(redisUrl).password || undefined,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
      },
    };

    const pubsub = new RedisPubSub({
      publisher: new Redis(redisUrl),
      subscriber: new Redis(redisUrl),
    });

    return pubsub;
  },
  inject: [ConfigService],
} as Provider;
