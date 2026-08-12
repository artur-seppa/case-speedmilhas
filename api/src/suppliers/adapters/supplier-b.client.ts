import { Injectable, Optional } from '@nestjs/common';

import { fetchWithTimeout } from '../../common/http/fetch-with-timeout';
import { SupplierHttpError } from '../errors';
import { NormalizedOffer, SupplierName } from '../normalized-offer';
import { SupplierClient, SupplierSearchQuery } from '../ports/supplier-client.port';

interface SupplierBResponse {
  dados: Array<{ pontos: number; taxa: { valor: number; moeda: string }; cia: string }>;
}

@Injectable()
export class SupplierBClient implements SupplierClient {
  readonly name: SupplierName = 'supplier-b';
  private readonly baseUrl: string;

  constructor(@Optional() baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.SUPPLIERS_BASE_URL ?? 'http://localhost:4000';
  }

  async search(query: SupplierSearchQuery, deadline: number): Promise<NormalizedOffer[]> {
    try {
      return await this.attempt(query, deadline);
    } catch (err) {
      if (!this.isRetryable(err) || Date.now() >= deadline) {
        throw err;
      }
      return this.attempt(query, deadline);
    }
  }

  private isRetryable(err: unknown): boolean {
    return err instanceof SupplierHttpError && (err.status === 429 || err.status === 500);
  }

  private async attempt(query: SupplierSearchQuery, deadline: number): Promise<NormalizedOffer[]> {
    const url = new URL('/supplier-b/search', this.baseUrl);
    url.searchParams.set('from', query.origin);
    url.searchParams.set('to', query.destination);
    url.searchParams.set('day', query.date);

    const response = await fetchWithTimeout(url.toString(), { method: 'GET' }, deadline);
    if (!response.ok) {
      throw new SupplierHttpError(`supplier-b respondeu ${response.status}`, response.status);
    }

    const body = (await response.json()) as SupplierBResponse;
    return body.dados.map((d) => ({
      supplier: this.name,
      carrier: d.cia,
      miles: d.pontos,
      taxesBrl: d.taxa.valor,
    }));
  }
}
