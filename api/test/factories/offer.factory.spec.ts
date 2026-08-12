import { buildNormalizedOffer, buildQuote } from './offer.factory';

describe('offer.factory', () => {
  it('buildNormalizedOffer aplica defaults plausíveis', () => {
    const offer = buildNormalizedOffer();

    expect(offer.supplier).toBe('supplier-a');
    expect(offer.carrier).toBe('LATAM');
    expect(offer.miles).toBeGreaterThan(0);
    expect(offer.taxesBrl).toBeGreaterThan(0);
  });

  it('buildNormalizedOffer aceita overrides', () => {
    const offer = buildNormalizedOffer({ supplier: 'supplier-b', miles: 12345 });

    expect(offer.supplier).toBe('supplier-b');
    expect(offer.miles).toBe(12345);
  });

  it('buildQuote inclui um quoteId em formato uuid', () => {
    const quote = buildQuote();

    expect(quote.quoteId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(quote.miles).toBeGreaterThan(0);
  });

  it('buildQuote aceita overrides, incluindo quoteId fixo', () => {
    const quote = buildQuote({ quoteId: 'fixed-id', carrier: 'AZUL' });

    expect(quote.quoteId).toBe('fixed-id');
    expect(quote.carrier).toBe('AZUL');
  });
});
