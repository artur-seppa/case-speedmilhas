import { SearchRequest, SearchResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class SearchApiError extends Error {}

interface NestErrorBody {
  message?: string | string[];
}

export async function searchFlights(request: SearchRequest): Promise<SearchResponse> {
  const res = await fetch(`${API_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const body: NestErrorBody = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new SearchApiError(message ?? `Busca falhou (${res.status})`);
  }

  return res.json();
}
