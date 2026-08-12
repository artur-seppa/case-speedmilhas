import { SupplierBClient } from './supplier-b.client';
import { SupplierHttpError } from '../errors';

describe('SupplierBClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normaliza dados para NormalizedOffer[]', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ dados: [{ pontos: 16000, taxa: { valor: 167.99, moeda: 'BRL' }, cia: 'AZUL' }] }),
        { status: 200 },
      ),
    );

    const client = new SupplierBClient('http://mock:4000');
    const offers = await client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000);

    expect(offers).toEqual([{ supplier: 'supplier-b', carrier: 'AZUL', miles: 16000, taxesBrl: 167.99 }]);
  });

  it('monta a URL com os nomes de parâmetro from/to/day', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ dados: [] }), { status: 200 }));

    const client = new SupplierBClient('http://mock:4000');
    await client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000);

    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe('/supplier-b/search');
    expect(calledUrl.searchParams.get('from')).toBe('GRU');
    expect(calledUrl.searchParams.get('to')).toBe('GIG');
    expect(calledUrl.searchParams.get('day')).toBe('2026-08-15');
  });

  it('tenta novamente uma vez em 429 e usa a resposta da segunda tentativa', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ erro: 'rate limit' }), { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ dados: [{ pontos: 1000, taxa: { valor: 1, moeda: 'BRL' }, cia: 'GOL' }] }), {
          status: 200,
        }),
      );

    const client = new SupplierBClient('http://mock:4000');
    const offers = await client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(offers).toEqual([{ supplier: 'supplier-b', carrier: 'GOL', miles: 1000, taxesBrl: 1 }]);
  });

  it('desiste após 1 retry em 500 persistente', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ erro: 'falha interna' }), { status: 500 }));

    const client = new SupplierBClient('http://mock:4000');

    await expect(
      client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000),
    ).rejects.toBeInstanceOf(SupplierHttpError);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('não tenta novamente se o orçamento já esgotou após a primeira falha', async () => {
    let now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const deadline = now + 100;

    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      now += 200; // simula tempo passando durante a chamada que falhou
      return new Response(JSON.stringify({ erro: 'falha interna' }), { status: 500 });
    });

    const client = new SupplierBClient('http://mock:4000');

    await expect(
      client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, deadline),
    ).rejects.toBeInstanceOf(SupplierHttpError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
