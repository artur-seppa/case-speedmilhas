import { SupplierCClient } from './supplier-c.client';

function respond(data: unknown): Response {
  return new Response(JSON.stringify({ data }), { status: 200 });
}

describe('SupplierCClient', () => {
  const client = new SupplierCClient('http://mock:4000');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normaliza registros limpos e traduz o código IATA para o nome da companhia', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(respond([{ price_miles: 17500, fee: 55.79, airline_code: 'LA' }]));

    const offers = await client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000);

    expect(offers).toEqual([{ supplier: 'supplier-c', carrier: 'LATAM', miles: 17500, taxesBrl: 55.79 }]);
  });

  it('descarta registros com fee null, mantendo os demais', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      respond([
        { price_miles: 17500, fee: null, airline_code: 'LA' },
        { price_miles: 22500, fee: 155.7, airline_code: 'AD' },
      ]),
    );

    const offers = await client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000);

    expect(offers).toEqual([{ supplier: 'supplier-c', carrier: 'AZUL', miles: 22500, taxesBrl: 155.7 }]);
  });

  it('descarta registros com price_miles como string, mantendo os demais', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      respond([
        { price_miles: '17500', fee: 55.79, airline_code: 'LA' },
        { price_miles: 22500, fee: 155.7, airline_code: 'AD' },
      ]),
    );

    const offers = await client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000);

    expect(offers).toEqual([{ supplier: 'supplier-c', carrier: 'AZUL', miles: 22500, taxesBrl: 155.7 }]);
  });

  it('retorna array vazio quando data vem vazio', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(respond([]));

    const offers = await client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000);

    expect(offers).toEqual([]);
  });

  it('envia POST com body JSON no formato esperado', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(respond([]));

    await client.search({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' }, Date.now() + 5000);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/supplier-c/v2/quotes');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ origin: 'GRU', destination: 'GIG', date: '2026-08-15' });
  });
});
