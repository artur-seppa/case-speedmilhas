import RedisMock from 'ioredis-mock';
import type Redis from 'ioredis';

import { SearchFlightsResult } from '../use-cases/search-flights.use-case';
import { RedisSearchCacheRepository } from './search-cache.repository';

const query = { origin: 'GRU', destination: 'GIG', date: '2026-08-15' };

const result: SearchFlightsResult = {
  offers: [],
  suppliers: {
    'supplier-a': { status: 'ok' },
    'supplier-b': { status: 'ok' },
    'supplier-c': { status: 'ok' },
  },
  partial: false,
  tookMs: 42,
};

describe('RedisSearchCacheRepository', () => {
  it('devolve null quando não há cache pra essa busca', async () => {
    const redis = new RedisMock() as unknown as Redis;
    const repo = new RedisSearchCacheRepository(redis);

    expect(await repo.get(query)).toBeNull();
  });

  it('devolve o resultado salvo pra mesma origem, destino e data', async () => {
    const redis = new RedisMock() as unknown as Redis;
    const repo = new RedisSearchCacheRepository(redis);

    await repo.set(query, result, 60);

    expect(await repo.get(query)).toEqual(result);
  });

  it('salva com o TTL informado', async () => {
    const redis = new RedisMock() as unknown as Redis;
    const repo = new RedisSearchCacheRepository(redis);

    await repo.set(query, result, 60);

    const ttl = await redis.ttl(`search:${query.origin}:${query.destination}:${query.date}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('trata buscas diferentes como chaves diferentes', async () => {
    const redis = new RedisMock() as unknown as Redis;
    const repo = new RedisSearchCacheRepository(redis);

    await repo.set(query, result, 60);

    expect(await repo.get({ ...query, destination: 'BSB' })).toBeNull();
  });
});
