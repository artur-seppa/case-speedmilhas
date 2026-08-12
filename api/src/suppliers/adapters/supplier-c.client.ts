import { Injectable, Optional } from '@nestjs/common';

import { fetchWithTimeout } from '../../common/http/fetch-with-timeout';
import { SupplierHttpError } from '../errors';
import { NormalizedOffer, SupplierName } from '../normalized-offer';
import { SupplierClient, SupplierSearchQuery } from '../ports/supplier-client.port';

interface SupplierCRecord {
  price_miles: unknown;
  fee: unknown;
  airline_code: unknown;
}

interface SupplierCResponse {
  data: SupplierCRecord[];
}

const CARRIER_NAMES: Record<string, string> = { LA: 'LATAM', G3: 'GOL', AD: 'AZUL' };

@Injectable()
export class SupplierCClient implements SupplierClient {
  readonly name: SupplierName = 'supplier-c';
  private readonly baseUrl: string;

  constructor(@Optional() baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.SUPPLIERS_BASE_URL ?? 'http://localhost:4000';
  }

  async search(query: SupplierSearchQuery, deadline: number): Promise<NormalizedOffer[]> {
    const url = new URL('/supplier-c/v2/quotes', this.baseUrl);

    const response = await fetchWithTimeout(
      url.toString(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      },
      deadline,
    );
    if (!response.ok) {
      throw new SupplierHttpError(`supplier-c respondeu ${response.status}`, response.status);
    }

    const body = (await response.json()) as SupplierCResponse;
    return body.data.filter(this.isValid).map((r) => ({
      supplier: this.name,
      carrier: CARRIER_NAMES[r.airline_code as string] ?? String(r.airline_code),
      miles: r.price_miles as number,
      taxesBrl: r.fee as number,
    }));
  }

  private isValid(record: SupplierCRecord): boolean {
    return (
      typeof record.price_miles === 'number' &&
      typeof record.fee === 'number' &&
      typeof record.airline_code === 'string' &&
      record.airline_code.length > 0
    );
  }
}
