import { fetchWithTimeout, SupplierTimeoutError } from './fetch-with-timeout';

describe('fetchWithTimeout', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('repassa a resposta quando o fetch resolve antes do deadline', async () => {
    const fakeResponse = new Response('{}', { status: 200 });
    jest.spyOn(global, 'fetch').mockResolvedValue(fakeResponse);

    const result = await fetchWithTimeout('http://mock/x', {}, Date.now() + 5000);

    expect(result).toBe(fakeResponse);
  });

  it('lança SupplierTimeoutError sem chamar fetch se o orçamento já esgotou', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(fetchWithTimeout('http://mock/x', {}, Date.now() - 10)).rejects.toBeInstanceOf(
      SupplierTimeoutError,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('converte um TimeoutError do fetch em SupplierTimeoutError', async () => {
    const timeoutErr = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    jest.spyOn(global, 'fetch').mockRejectedValue(timeoutErr);

    await expect(fetchWithTimeout('http://mock/x', {}, Date.now() + 5000)).rejects.toBeInstanceOf(
      SupplierTimeoutError,
    );
  });

  it('repassa outros erros de fetch sem conversão', async () => {
    const networkErr = new Error('ECONNREFUSED');
    jest.spyOn(global, 'fetch').mockRejectedValue(networkErr);

    await expect(fetchWithTimeout('http://mock/x', {}, Date.now() + 5000)).rejects.toBe(networkErr);
  });
});
