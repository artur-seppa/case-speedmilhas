import { SupplierName } from '../../suppliers/normalized-offer';
import { SupplierResultStatus } from '../use-cases/search-flights.use-case';

export interface OfferResponseDto {
  quoteId: string;
  supplier: SupplierName;
  carrier: string;
  miles: number;
  taxesBrl: number;
}

export interface SearchResponseDto {
  offers: OfferResponseDto[];
  suppliers: Record<SupplierName, SupplierResultStatus>;
  partial: boolean;
  tookMs: number;
}
