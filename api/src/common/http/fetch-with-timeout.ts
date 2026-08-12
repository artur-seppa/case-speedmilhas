export class SupplierTimeoutError extends Error {}

function hasErrorName(err: unknown): err is { name: string } {
  return typeof err === 'object' && err !== null && 'name' in err;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  deadline: number,
): Promise<Response> {
  const remainingMs = deadline - Date.now();

  if (remainingMs <= 0) {
    throw new SupplierTimeoutError(`orçamento de tempo já esgotado para ${url}`);
  }

  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(remainingMs) });
  } catch (err) {
    if (hasErrorName(err) && err.name === 'TimeoutError') {
      throw new SupplierTimeoutError(`requisição a ${url} excedeu ${remainingMs}ms`);
    }
    throw err;
  }
}
