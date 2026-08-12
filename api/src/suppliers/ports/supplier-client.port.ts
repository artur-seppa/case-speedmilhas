import { NormalizedOffer, SupplierName } from '../normalized-offer';

export interface SupplierSearchQuery {
  origin: string;
  destination: string;
  date: string;
}

export interface SupplierClient {
  readonly name: SupplierName;
  search(query: SupplierSearchQuery, deadline: number): Promise<NormalizedOffer[]>;
}

export const SUPPLIER_A_CLIENT = Symbol('SUPPLIER_A_CLIENT');
export const SUPPLIER_B_CLIENT = Symbol('SUPPLIER_B_CLIENT');
export const SUPPLIER_C_CLIENT = Symbol('SUPPLIER_C_CLIENT');
