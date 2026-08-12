import { SupplierAClient } from './supplier-a.client';
import { SupplierHttpError } from '../errors';

describe('SupplierAClient', () => {
  const client = new SupplierAClient('http://mock:4000');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normaliza results para NormalizedOffer[]', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ results: [{ miles: 18500, taxes_brl: 75.51, carrier: 'GOL' }] }),
        { status: 200 },
      ),
    );

    const offers = await client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000);

    expect(offers).toEqual([{ supplier: 'supplier-a', carrier: 'GOL', miles: 18500, taxesBrl: 75.51 }]);
  });

  it('lança SupplierHttpError em resposta não-2xx', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'x' }), { status: 500 }));

    await expect(
      client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000),
    ).rejects.toBeInstanceOf(SupplierHttpError);
  });

  it('monta a URL com os query params esperados pelo fornecedor A', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }));

    await client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000);

    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe('/supplier-a/quotes');
    expect(calledUrl.searchParams.get('origin')).toBe('GRU');
    expect(calledUrl.searchParams.get('destination')).toBe('GIG');
    expect(calledUrl.searchParams.get('date')).toBe('2026-08-15');
  });
});
