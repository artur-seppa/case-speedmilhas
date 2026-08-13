import { SearchResponse } from '../types';
import { OfferCard } from './OfferCard';
import { PartialResultsBanner } from './PartialResultsBanner';

interface SearchResultsProps {
  result: SearchResponse;
}

export function SearchResults({ result }: SearchResultsProps) {
  const cheapestMiles = result.offers[0]?.miles;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <PartialResultsBanner suppliers={result.suppliers} />

      {result.offers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-(--color-line) px-5 py-10 text-center text-sm text-(--color-muted)">
          Nenhuma oferta chegou a tempo para essa rota e data. Tente buscar de novo em instantes.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.offers.map((offer) => (
            <OfferCard key={offer.quoteId} offer={offer} cheapest={offer.miles === cheapestMiles} />
          ))}
        </ul>
      )}

      <p className="text-right text-xs text-(--color-muted)">busca levou {result.tookMs}ms</p>
    </div>
  );
}
