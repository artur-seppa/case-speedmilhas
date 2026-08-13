import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../common/redis/redis.provider';
import { SupplierSearchQuery } from '../../suppliers/ports/supplier-client.port';
import { SearchFlightsResult } from '../use-cases/search-flights.use-case';

export interface SearchCacheRepository {
  get(query: SupplierSearchQuery): Promise<SearchFlightsResult | null>;
  set(query: SupplierSearchQuery, result: SearchFlightsResult, ttlSeconds: number): Promise<void>;
}

export const SEARCH_CACHE_REPOSITORY = Symbol('SEARCH_CACHE_REPOSITORY');

@Injectable()
export class RedisSearchCacheRepository implements SearchCacheRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get(query: SupplierSearchQuery): Promise<SearchFlightsResult | null> {
    const raw = await this.redis.get(this.keyFor(query));
    return raw ? (JSON.parse(raw) as SearchFlightsResult) : null;
  }

  async set(query: SupplierSearchQuery, result: SearchFlightsResult, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.keyFor(query), JSON.stringify(result), 'EX', ttlSeconds);
  }

  private keyFor(query: SupplierSearchQuery): string {
    return `search:${query.origin}:${query.destination}:${query.date}`;
  }
}
