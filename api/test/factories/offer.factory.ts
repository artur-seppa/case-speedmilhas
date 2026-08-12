import { randomUUID } from 'node:crypto';

import { NormalizedOffer } from '../../src/suppliers/normalized-offer';
import { Quote } from '../../src/quotes/quote';

let sequence = 0;

export function buildNormalizedOffer(overrides: Partial<NormalizedOffer> = {}): NormalizedOffer {
  sequence += 1;

  return {
    supplier: 'supplier-a',
    carrier: 'LATAM',
    miles: 15000 + sequence * 100,
    taxesBrl: 79.9,
    ...overrides,
  };
}

export function buildQuote(overrides: Partial<Quote> = {}): Quote {
  const offer = buildNormalizedOffer(overrides);

  return {
    ...offer,
    quoteId: overrides.quoteId ?? randomUUID(),
  };
}
