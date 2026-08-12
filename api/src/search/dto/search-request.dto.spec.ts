import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SearchRequestDto } from './search-request.dto';

async function validateInput(input: Record<string, unknown>) {
  const dto = plainToInstance(SearchRequestDto, input);
  return validate(dto);
}

describe('SearchRequestDto', () => {
  it('aceita origin/destination/date válidos, normalizando caixa e espaços', async () => {
    const errors = await validateInput({ origin: ' gru ', destination: 'gig', date: '2026-08-15' });
    expect(errors).toHaveLength(0);
  });

  it('rejeita aeroporto fora da lista atendida', async () => {
    const errors = await validateInput({ origin: 'JFK', destination: 'GIG', date: '2026-08-15' });
    expect(errors.some((e) => e.property === 'origin')).toBe(true);
  });

  it('rejeita data fora do formato YYYY-MM-DD', async () => {
    const errors = await validateInput({ origin: 'GRU', destination: 'GIG', date: '15/08/2026' });
    expect(errors.some((e) => e.property === 'date')).toBe(true);
  });
});
