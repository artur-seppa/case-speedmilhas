'use client';

import { FormEvent, useState } from 'react';
import { AIRPORTS, AIRPORT_LABELS } from '../constants';
import { SearchRequest } from '../types';

interface SearchFormProps {
  onSearch: (request: SearchRequest) => void;
  disabled: boolean;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function SearchForm({ onSearch, disabled }: SearchFormProps) {
  const [origin, setOrigin] = useState('GRU');
  const [destination, setDestination] = useState('GIG');
  const [date, setDate] = useState(todayIso());
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (origin === destination) {
      setValidationError('Origem e destino devem ser diferentes.');
      return;
    }

    setValidationError(null);
    onSearch({ origin, destination, date });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border border-(--color-line) bg-(--color-paper-raised) p-6 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-(--color-ink)">Origem</span>
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className="rounded-md border border-(--color-line) bg-white px-3 py-2 text-sm focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent-soft) focus:outline-none"
        >
          {AIRPORTS.map((code) => (
            <option key={code} value={code}>
              {AIRPORT_LABELS[code]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-(--color-ink)">Destino</span>
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="rounded-md border border-(--color-line) bg-white px-3 py-2 text-sm focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent-soft) focus:outline-none"
        >
          {AIRPORTS.map((code) => (
            <option key={code} value={code}>
              {AIRPORT_LABELS[code]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-(--color-ink)">Data</span>
        <input
          type="date"
          value={date}
          min={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-(--color-line) bg-white px-3 py-2 text-sm focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent-soft) focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-(--color-ink) px-5 py-2 text-sm font-semibold text-(--color-paper) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? 'Buscando…' : 'Buscar'}
      </button>

      {validationError ? (
        <p className="text-sm text-(--color-warn) sm:col-span-4" role="alert">
          {validationError}
        </p>
      ) : null}
    </form>
  );
}
