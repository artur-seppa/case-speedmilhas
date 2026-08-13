import { Inject, Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import Redis from 'ioredis';

import { NormalizedOffer } from '../../suppliers/normalized-offer';
import { REDIS_CLIENT } from '../../common/redis/redis.provider';

export interface QuoteRepository {
  save(offer: NormalizedOffer, ttlSeconds: number): Promise<string>;
  find(quoteId: string): Promise<NormalizedOffer | null>;
}

export const QUOTE_REPOSITORY = Symbol('QUOTE_REPOSITORY');

@Injectable()
export class RedisQuoteRepository implements QuoteRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async save(offer: NormalizedOffer, ttlSeconds: number): Promise<string> {
    const quoteId = ulid();
    await this.redis.set(`quote:${quoteId}`, JSON.stringify(offer), 'EX', ttlSeconds);
    return quoteId;
  }

  async find(quoteId: string): Promise<NormalizedOffer | null> {
    const raw = await this.redis.get(`quote:${quoteId}`);
    return raw ? (JSON.parse(raw) as NormalizedOffer) : null;
  }
}
