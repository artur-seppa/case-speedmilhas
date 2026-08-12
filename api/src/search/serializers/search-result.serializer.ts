import { SearchResponseDto } from '../dto/search-response.dto';
import { SearchFlightsResult } from '../use-cases/search-flights.use-case';

export function serializeSearchResult(result: SearchFlightsResult): SearchResponseDto {
  return {
    offers: result.offers.map((offer) => ({
      quoteId: offer.quoteId,
      supplier: offer.supplier,
      carrier: offer.carrier,
      miles: offer.miles,
      taxesBrl: offer.taxesBrl,
    })),
    suppliers: result.suppliers,
    partial: result.partial,
    tookMs: result.tookMs,
  };
}
