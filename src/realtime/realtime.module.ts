import { Global, Module } from '@nestjs/common';
import { redisPubSubProvider } from './redis-pubsub.provider';
import { RealtimeService } from './realtime.service';
import { NotificationsResolver } from './notifications.resolver';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [redisPubSubProvider, RealtimeService, NotificationsResolver],
  exports: [RealtimeService, redisPubSubProvider],
})
export class RealtimeModule {}
