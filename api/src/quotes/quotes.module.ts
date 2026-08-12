import { Module } from '@nestjs/common';

import { redisProvider } from '../common/redis/redis.provider';
import { QUOTE_REPOSITORY, RedisQuoteRepository } from './repositories/quote.repository';

@Module({
  providers: [redisProvider, { provide: QUOTE_REPOSITORY, useClass: RedisQuoteRepository }],
  exports: [QUOTE_REPOSITORY],
})
export class QuotesModule {}
