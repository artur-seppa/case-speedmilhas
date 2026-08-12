import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';

import { NormalizedOffer } from '../../suppliers/normalized-offer';
import { REDIS_CLIENT } from '../../common/redis/redis.provider';

export interface QuoteRepository {
  save(offer: NormalizedOffer, ttlSeconds: number): Promise<string>;
}

export const QUOTE_REPOSITORY = Symbol('QUOTE_REPOSITORY');

@Injectable()
export class RedisQuoteRepository implements QuoteRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async save(offer: NormalizedOffer, ttlSeconds: number): Promise<string> {
    const quoteId = randomUUID();
    await this.redis.set(`quote:${quoteId}`, JSON.stringify(offer), 'EX', ttlSeconds);
    return quoteId;
  }
}
