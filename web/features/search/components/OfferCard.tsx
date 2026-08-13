import { OfferResponse } from '../types';
import { SUPPLIER_LABELS } from '../constants';

interface OfferCardProps {
  offer: OfferResponse;
  cheapest: boolean;
}

const milesFormatter = new Intl.NumberFormat('pt-BR');
const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function OfferCard({ offer, cheapest }: OfferCardProps) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-(--color-line) bg-(--color-paper-raised) px-5 py-4">
      <div className="flex flex-col gap-1">
        <span className="font-(family-name:--font-display) text-lg text-(--color-ink)">{offer.carrier}</span>
        <span className="text-xs text-(--color-muted)">
          {SUPPLIER_LABELS[offer.supplier] ?? offer.supplier} · taxas {brlFormatter.format(offer.taxesBrl)}
        </span>
      </div>

      <div className="flex flex-col items-end gap-1">
        {cheapest ? (
          <span className="rounded-full bg-(--color-accent-soft) px-2 py-0.5 text-[11px] font-semibold tracking-wide text-(--color-accent) uppercase">
            Melhor oferta
          </span>
        ) : null}
        <span className="font-(family-name:--font-data) text-2xl font-semibold tabular-nums text-(--color-accent)">
          {milesFormatter.format(offer.miles)}
          <span className="ml-1 text-xs font-normal text-(--color-muted)">milhas</span>
        </span>
      </div>
    </li>
  );
}
