export type SupplierName = 'supplier-a' | 'supplier-b' | 'supplier-c';

export interface SearchRequest {
  origin: string;
  destination: string;
  date: string;
}

export interface OfferResponse {
  quoteId: string;
  supplier: SupplierName;
  carrier: string;
  miles: number;
  taxesBrl: number;
}

export interface SupplierResultStatus {
  status: 'ok' | 'failed';
  reason?: 'timeout' | 'http_error' | 'network_error';
}

export interface SearchResponse {
  offers: OfferResponse[];
  suppliers: Record<SupplierName, SupplierResultStatus>;
  partial: boolean;
  tookMs: number;
}
