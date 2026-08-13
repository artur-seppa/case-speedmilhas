'use client';

import { useState } from 'react';
import { searchFlights, SearchApiError } from './api';
import { SearchForm } from './components/SearchForm';
import { SearchResults } from './components/SearchResults';
import { SearchRequest, SearchResponse } from './types';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function SearchPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSearch(request: SearchRequest) {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await searchFlights(request);
      setResult(response);
      setStatus('success');
    } catch (err) {
      const message = err instanceof SearchApiError ? err.message : 'Não foi possível buscar agora. Tente de novo.';
      setErrorMessage(message);
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <SearchForm onSearch={handleSearch} disabled={status === 'loading'} />

      {status === 'loading' ? (
        <p className="mt-6 text-sm text-(--color-muted)" role="status">
          Consultando fornecedores…
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="mt-6 rounded-lg border border-(--color-warn)/30 bg-(--color-warn-soft) px-4 py-3 text-sm text-(--color-warn)" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {status === 'success' && result ? <SearchResults result={result} /> : null}
    </div>
  );
}
