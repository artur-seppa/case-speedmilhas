import { buildQuote } from '../../../test/factories/offer.factory';
import { SearchFlightsResult } from '../use-cases/search-flights.use-case';
import { serializeSearchResult } from './search-result.serializer';

describe('serializeSearchResult', () => {
  it('mapeia SearchFlightsResult para o contrato de resposta HTTP', () => {
    const quote = buildQuote({ quoteId: 'q1', supplier: 'supplier-a', carrier: 'GOL', miles: 18500, taxesBrl: 75.51 });
    const result: SearchFlightsResult = {
      offers: [quote],
      suppliers: {
        'supplier-a': { status: 'ok' },
        'supplier-b': { status: 'failed', reason: 'timeout' },
        'supplier-c': { status: 'ok' },
      },
      partial: true,
      tookMs: 5480,
    };

    expect(serializeSearchResult(result)).toEqual({
      offers: [{ quoteId: 'q1', supplier: 'supplier-a', carrier: 'GOL', miles: 18500, taxesBrl: 75.51 }],
      suppliers: result.suppliers,
      partial: true,
      tookMs: 5480,
    });
  });
});
