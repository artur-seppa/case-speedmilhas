import { Module } from '@nestjs/common';

import { redisProvider, REDIS_CLIENT } from '../common/redis/redis.provider';
import { QUOTE_REPOSITORY, RedisQuoteRepository } from './repositories/quote.repository';

@Module({
  providers: [redisProvider, { provide: QUOTE_REPOSITORY, useClass: RedisQuoteRepository }],
  exports: [QUOTE_REPOSITORY, REDIS_CLIENT],
})
export class QuotesModule {}
