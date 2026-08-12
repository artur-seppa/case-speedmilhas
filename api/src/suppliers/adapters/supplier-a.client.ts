import { Injectable, Optional } from '@nestjs/common';

import { fetchWithTimeout } from '../../common/http/fetch-with-timeout';
import { SupplierHttpError } from '../errors';
import { NormalizedOffer, SupplierName } from '../normalized-offer';
import { SupplierClient, SupplierSearchQuery } from '../ports/supplier-client.port';

interface SupplierAResponse {
  results: Array<{ miles: number; taxes_brl: number; carrier: string }>;
}

@Injectable()
export class SupplierAClient implements SupplierClient {
  readonly name: SupplierName = 'supplier-a';
  private readonly baseUrl: string;

  constructor(@Optional() baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.SUPPLIERS_BASE_URL ?? 'http://localhost:4000';
  }

  async search(query: SupplierSearchQuery, deadline: number): Promise<NormalizedOffer[]> {
    const url = new URL('/supplier-a/quotes', this.baseUrl);
    url.searchParams.set('origin', query.origin);
    url.searchParams.set('destination', query.destination);
    url.searchParams.set('date', query.date);

    const response = await fetchWithTimeout(url.toString(), { method: 'GET' }, deadline);
    if (!response.ok) {
      throw new SupplierHttpError(`supplier-a respondeu ${response.status}`, response.status);
    }

    const body = (await response.json()) as SupplierAResponse;
    return body.results.map((r) => ({
      supplier: this.name,
      carrier: r.carrier,
      miles: r.miles,
      taxesBrl: r.taxes_brl,
    }));
  }
}
