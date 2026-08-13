import { Module } from '@nestjs/common';

import { QuotesModule } from '../quotes/quotes.module';
import { SupplierAClient } from '../suppliers/adapters/supplier-a.client';
import { SupplierBClient } from '../suppliers/adapters/supplier-b.client';
import { SupplierCClient } from '../suppliers/adapters/supplier-c.client';
import { SUPPLIER_A_CLIENT, SUPPLIER_B_CLIENT, SUPPLIER_C_CLIENT } from '../suppliers/ports/supplier-client.port';
import { SearchController } from './search.controller';
import { SEARCH_CACHE_REPOSITORY, RedisSearchCacheRepository } from './repositories/search-cache.repository';
import { SearchFlightsUseCase } from './use-cases/search-flights.use-case';

@Module({
  imports: [QuotesModule],
  controllers: [SearchController],
  providers: [
    SearchFlightsUseCase,
    { provide: SEARCH_CACHE_REPOSITORY, useClass: RedisSearchCacheRepository },
    { provide: SUPPLIER_A_CLIENT, useClass: SupplierAClient },
    { provide: SUPPLIER_B_CLIENT, useClass: SupplierBClient },
    { provide: SUPPLIER_C_CLIENT, useClass: SupplierCClient },
  ],
})
export class SearchModule {}
