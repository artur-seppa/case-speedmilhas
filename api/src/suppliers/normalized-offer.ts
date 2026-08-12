export type SupplierName = 'supplier-a' | 'supplier-b' | 'supplier-c';

export interface NormalizedOffer {
  supplier: SupplierName;
  carrier: string;
  miles: number;
  taxesBrl: number;
}
