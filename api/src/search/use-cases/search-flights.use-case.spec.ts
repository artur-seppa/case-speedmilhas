import { SupplierHttpError } from '../../suppliers/errors';
import { SupplierTimeoutError } from '../../common/http/fetch-with-timeout';
import { NormalizedOffer, SupplierName } from '../../suppliers/normalized-offer';
import { SupplierClient, SupplierSearchQuery } from '../../suppliers/ports/supplier-client.port';
import { QuoteRepository } from '../../quotes/repositories/quote.repository';
import { buildNormalizedOffer } from '../../../test/factories/offer.factory';
import { SearchFlightsUseCase } from './search-flights.use-case';

class FakeSupplierClient implements SupplierClient {
  constructor(
    public readonly name: SupplierName,
    private readonly behavior: () => Promise<NormalizedOffer[]>,
  ) {}

  search(): Promise<NormalizedOffer[]> {
    return this.behavior();
  }
}

class FakeQuoteRepository implements QuoteRepository {
  public saved: NormalizedOffer[] = [];
  private counter = 0;

  async save(offer: NormalizedOffer): Promise<string> {
    this.counter += 1;
    this.saved.push(offer);
    return `quote-${this.counter}`;
  }
}

const query: SupplierSearchQuery = { origin: 'GRU', destination: 'GIG', date: '2026-08-15' };

function buildUseCase(clients: {
  a: SupplierClient;
  b: SupplierClient;
  c: SupplierClient;
}): { useCase: SearchFlightsUseCase; quotes: FakeQuoteRepository } {
  const quotes = new FakeQuoteRepository();
  const useCase = new SearchFlightsUseCase(clients.a, clients.b, clients.c, quotes);
  return { useCase, quotes };
}

describe('SearchFlightsUseCase', () => {
  it('agrega e ordena ofertas de todos os fornecedores quando todos respondem', async () => {
    const { useCase } = buildUseCase({
      a: new FakeSupplierClient('supplier-a', async () => [buildNormalizedOffer({ supplier: 'supplier-a', miles: 20000 })]),
      b: new FakeSupplierClient('supplier-b', async () => [buildNormalizedOffer({ supplier: 'supplier-b', miles: 10000 })]),
      c: new FakeSupplierClient('supplier-c', async () => [buildNormalizedOffer({ supplier: 'supplier-c', miles: 15000 })]),
    });

    const result = await useCase.execute(query);

    expect(result.offers.map((o) => o.miles)).toEqual([10000, 15000, 20000]);
    expect(result.offers.every((o) => typeof o.quoteId === 'string')).toBe(true);
    expect(result.suppliers).toEqual({
      'supplier-a': { status: 'ok' },
      'supplier-b': { status: 'ok' },
      'supplier-c': { status: 'ok' },
    });
    expect(result.partial).toBe(false);
    expect(result.tookMs).toBeGreaterThanOrEqual(0);
  });

  it('marca partial=true e reason=timeout quando um fornecedor estoura o deadline', async () => {
    const { useCase } = buildUseCase({
      a: new FakeSupplierClient('supplier-a', async () => [buildNormalizedOffer({ supplier: 'supplier-a', miles: 20000 })]),
      b: new FakeSupplierClient('supplier-b', async () => {
        throw new SupplierTimeoutError('timeout');
      }),
      c: new FakeSupplierClient('supplier-c', async () => [buildNormalizedOffer({ supplier: 'supplier-c', miles: 15000 })]),
    });

    const result = await useCase.execute(query);

    expect(result.partial).toBe(true);
    expect(result.suppliers['supplier-b']).toEqual({ status: 'failed', reason: 'timeout' });
    expect(result.offers.map((o) => o.miles)).toEqual([15000, 20000]);
  });

  it('marca reason=http_error quando um fornecedor responde erro HTTP', async () => {
    const { useCase } = buildUseCase({
      a: new FakeSupplierClient('supplier-a', async () => []),
      b: new FakeSupplierClient('supplier-b', async () => {
        throw new SupplierHttpError('boom', 500);
      }),
      c: new FakeSupplierClient('supplier-c', async () => []),
    });

    const result = await useCase.execute(query);

    expect(result.suppliers['supplier-b']).toEqual({ status: 'failed', reason: 'http_error' });
  });

  it('marca reason=network_error para qualquer outro erro', async () => {
    const { useCase } = buildUseCase({
      a: new FakeSupplierClient('supplier-a', async () => []),
      b: new FakeSupplierClient('supplier-b', async () => {
        throw new Error('ECONNREFUSED');
      }),
      c: new FakeSupplierClient('supplier-c', async () => []),
    });

    const result = await useCase.execute(query);

    expect(result.suppliers['supplier-b']).toEqual({ status: 'failed', reason: 'network_error' });
  });

  it('persiste cada oferta retornada no QuoteRepository', async () => {
    const { useCase, quotes } = buildUseCase({
      a: new FakeSupplierClient('supplier-a', async () => [buildNormalizedOffer({ supplier: 'supplier-a' })]),
      b: new FakeSupplierClient('supplier-b', async () => []),
      c: new FakeSupplierClient('supplier-c', async () => []),
    });

    await useCase.execute(query);

    expect(quotes.saved).toHaveLength(1);
  });

  it('descarta apenas a oferta cujo save falhou, sem derrubar a busca inteira', async () => {
    const quotes = new FakeQuoteRepository();
    quotes.save = jest.fn(async (offer: NormalizedOffer) => {
      if (offer.miles === 20000) {
        throw new Error('redis indisponível');
      }
      return `quote-${offer.miles}`;
    });
    const useCase = new SearchFlightsUseCase(
      new FakeSupplierClient('supplier-a', async () => [buildNormalizedOffer({ supplier: 'supplier-a', miles: 20000 })]),
      new FakeSupplierClient('supplier-b', async () => [buildNormalizedOffer({ supplier: 'supplier-b', miles: 10000 })]),
      new FakeSupplierClient('supplier-c', async () => []),
      quotes,
    );

    const result = await useCase.execute(query);

    expect(result.offers.map((o) => o.miles)).toEqual([10000]);
    expect(result.suppliers['supplier-a']).toEqual({ status: 'ok' });
  });
});
