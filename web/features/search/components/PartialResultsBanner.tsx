import { SupplierName, SupplierResultStatus } from '../types';
import { FAILURE_REASON_LABELS, SUPPLIER_LABELS } from '../constants';

interface PartialResultsBannerProps {
  suppliers: Record<SupplierName, SupplierResultStatus>;
}

export function PartialResultsBanner({ suppliers }: PartialResultsBannerProps) {
  const failed = Object.entries(suppliers).filter(([, status]) => status.status === 'failed');

  if (failed.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-(--color-warn)/30 bg-(--color-warn-soft) px-4 py-3 text-sm text-(--color-ink)"
    >
      <span aria-hidden className="mt-0.5 text-(--color-warn)">
        ⚠
      </span>
      <p>
        <span className="font-semibold">Resultado parcial.</span>{' '}
        {failed
          .map(([supplier, status]) => {
            const label = SUPPLIER_LABELS[supplier] ?? supplier;
            const reason = status.reason ? FAILURE_REASON_LABELS[status.reason] : 'não respondeu';
            return `${label} ${reason}`;
          })
          .join(' · ')}
        . As ofertas abaixo já chegaram — pode faltar alguma opção mais barata.
      </p>
    </div>
  );
}
