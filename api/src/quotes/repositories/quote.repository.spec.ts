import RedisMock from 'ioredis-mock';
import type Redis from 'ioredis';

import { buildNormalizedOffer } from '../../../test/factories/offer.factory';
import { RedisQuoteRepository } from './quote.repository';

describe('RedisQuoteRepository', () => {
  it('salva a oferta com TTL e retorna um quoteId em formato ulid', async () => {
    const redis = new RedisMock() as unknown as Redis;
    const repo = new RedisQuoteRepository(redis);
    const offer = buildNormalizedOffer({ miles: 20000 });

    const quoteId = await repo.save(offer, 900);

    expect(quoteId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);

    const stored = await redis.get(`quote:${quoteId}`);
    expect(JSON.parse(stored as string)).toEqual(offer);

    const ttl = await redis.ttl(`quote:${quoteId}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(900);
  });

  it('gera um quoteId diferente a cada save', async () => {
    const redis = new RedisMock() as unknown as Redis;
    const repo = new RedisQuoteRepository(redis);
    const offer = buildNormalizedOffer();

    const first = await repo.save(offer, 900);
    const second = await repo.save(offer, 900);

    expect(first).not.toBe(second);
  });
});
