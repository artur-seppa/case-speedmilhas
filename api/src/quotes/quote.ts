import { NormalizedOffer } from '../suppliers/normalized-offer';

export interface Quote extends NormalizedOffer {
  quoteId: string;
}
