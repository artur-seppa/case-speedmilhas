import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateOrderDto } from './create-order.dto';

async function validateInput(input: Record<string, unknown>) {
  const dto = plainToInstance(CreateOrderDto, input);
  return validate(dto);
}

const valid = {
  quoteId: 'quote-1',
  passageiro: { nome: 'Fulano de Tal', cpf: '111.444.777-35' },
  idempotencyKey: 'key-1',
};

describe('CreateOrderDto', () => {
  it('aceita um payload válido', async () => {
    const errors = await validateInput(valid);
    expect(errors).toHaveLength(0);
  });

  it('rejeita CPF inválido', async () => {
    const errors = await validateInput({ ...valid, passageiro: { nome: 'Fulano', cpf: '111.111.111-11' } });
    expect(errors.some((e) => e.property === 'passageiro')).toBe(true);
  });

  it('rejeita quoteId ausente', async () => {
    const { quoteId: _quoteId, ...rest } = valid;
    const errors = await validateInput(rest);
    expect(errors.some((e) => e.property === 'quoteId')).toBe(true);
  });

  it('rejeita idempotencyKey ausente', async () => {
    const { idempotencyKey: _idempotencyKey, ...rest } = valid;
    const errors = await validateInput(rest);
    expect(errors.some((e) => e.property === 'idempotencyKey')).toBe(true);
  });
});
