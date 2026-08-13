import { Inject, Injectable, Optional } from '@nestjs/common';

import { SupplierTimeoutError } from '../../common/http/fetch-with-timeout';
import { QuoteRepository, QUOTE_REPOSITORY } from '../../quotes/repositories/quote.repository';
import { Quote } from '../../quotes/quote';
import { SupplierHttpError } from '../../suppliers/errors';
import { NormalizedOffer, SupplierName } from '../../suppliers/normalized-offer';
import {
  SupplierClient,
  SupplierSearchQuery,
  SUPPLIER_A_CLIENT,
  SUPPLIER_B_CLIENT,
  SUPPLIER_C_CLIENT,
} from '../../suppliers/ports/supplier-client.port';
import { SearchCacheRepository, SEARCH_CACHE_REPOSITORY } from '../repositories/search-cache.repository';

export const SEARCH_BUDGET_MS = 5500;
export const QUOTE_TTL_SECONDS = 900;
export const SEARCH_CACHE_TTL_SECONDS = 60;

export type SupplierFailureReason = 'timeout' | 'http_error' | 'network_error';

export interface SupplierResultStatus {
  status: 'ok' | 'failed';
  reason?: SupplierFailureReason;
}

export interface SearchFlightsResult {
  offers: Quote[];
  suppliers: Record<SupplierName, SupplierResultStatus>;
  partial: boolean;
  tookMs: number;
}

@Injectable()
export class SearchFlightsUseCase {
  constructor(
    @Inject(SUPPLIER_A_CLIENT) private readonly supplierA: SupplierClient,
    @Inject(SUPPLIER_B_CLIENT) private readonly supplierB: SupplierClient,
    @Inject(SUPPLIER_C_CLIENT) private readonly supplierC: SupplierClient,
    @Inject(QUOTE_REPOSITORY) private readonly quotes: QuoteRepository,
    @Inject(SEARCH_CACHE_REPOSITORY) private readonly cache: SearchCacheRepository,
    @Optional() private readonly budgetMs: number = SEARCH_BUDGET_MS,
    @Optional() private readonly quoteTtlSeconds: number = QUOTE_TTL_SECONDS,
    @Optional() private readonly cacheTtlSeconds: number = SEARCH_CACHE_TTL_SECONDS,
  ) {}

  async execute(query: SupplierSearchQuery): Promise<SearchFlightsResult> {
    const start = Date.now();

    const cached = await this.cache.get(query);
    if (cached) {
      return { ...cached, tookMs: Date.now() - start };
    }

    const deadline = start + this.budgetMs;
    const clients = [this.supplierA, this.supplierB, this.supplierC];

    const settled = await Promise.allSettled(clients.map((client) => client.search(query, deadline)));

    const suppliers = {} as Record<SupplierName, SupplierResultStatus>;
    const rawOffers: NormalizedOffer[] = [];

    settled.forEach((result, index) => {
      const name = clients[index].name;
      if (result.status === 'fulfilled') {
        suppliers[name] = { status: 'ok' };
        rawOffers.push(...result.value);
      } else {
        suppliers[name] = { status: 'failed', reason: this.reasonFor(result.reason) };
      }
    });

    rawOffers.sort((a, b) => a.miles - b.miles || a.taxesBrl - b.taxesBrl);

    const persisted = await Promise.all(
      rawOffers.map(async (offer): Promise<Quote | null> => {
        try {
          const quoteId = await this.quotes.save(offer, this.quoteTtlSeconds);
          return { ...offer, quoteId };
        } catch {
          // Uma falha ao persistir (ex.: Redis indisponível) não pode derrubar a busca
          // inteira — a oferta em questão só fica não-reservável, o resto segue normal.
          return null;
        }
      }),
    );
    const offers = persisted.filter((quote): quote is Quote => quote !== null);

    const partial = Object.values(suppliers).some((status) => status.status !== 'ok');
    const result: SearchFlightsResult = { offers, suppliers, partial, tookMs: Date.now() - start };

    if (!partial) {
      await this.cache.set(query, result, this.cacheTtlSeconds).catch(() => undefined);
    }

    return result;
  }

  private reasonFor(err: unknown): SupplierFailureReason {
    if (err instanceof SupplierTimeoutError) return 'timeout';
    if (err instanceof SupplierHttpError) return 'http_error';
    return 'network_error';
  }
}
