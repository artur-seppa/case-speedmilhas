import { NotFoundException } from '@nestjs/common';

import { NormalizedOffer } from '../../suppliers/normalized-offer';
import { QuoteRepository } from '../../quotes/repositories/quote.repository';
import { CreateOrderInput, OrderRepository } from '../repositories/order.repository';
import { Order } from '../../generated/prisma/client';
import { CreateOrderUseCase } from './create-order.use-case';

class FakeQuoteRepository implements QuoteRepository {
  constructor(private readonly quote: NormalizedOffer | null) {}
  save(): Promise<string> {
    throw new Error('not used in this test');
  }
  find(): Promise<NormalizedOffer | null> {
    return Promise.resolve(this.quote);
  }
}

class FakeOrderRepository implements OrderRepository {
  public received?: CreateOrderInput;
  constructor(private readonly result: Order) {}
  create(input: CreateOrderInput): Promise<Order> {
    this.received = input;
    return Promise.resolve(this.result);
  }
}

const offer: NormalizedOffer = { supplier: 'supplier-a', carrier: 'GOL', miles: 18500, taxesBrl: 75.51 };
const persistedOrder: Order = {
  id: '01J000000000000000000000',
  quoteId: 'quote-1',
  supplier: offer.supplier,
  carrier: offer.carrier,
  miles: offer.miles,
  taxesBrl: offer.taxesBrl,
  passengerName: 'Fulano de Tal',
  passengerCpf: '11144477735',
  idempotencyKey: 'key-1',
  createdAt: new Date('2026-08-12T12:00:00.000Z'),
};

describe('CreateOrderUseCase', () => {
  it('cria o pedido a partir da quote encontrada', async () => {
    const quotes = new FakeQuoteRepository(offer);
    const orders = new FakeOrderRepository(persistedOrder);
    const useCase = new CreateOrderUseCase(quotes, orders);

    const result = await useCase.execute({
      quoteId: 'quote-1',
      passageiro: { nome: 'Fulano de Tal', cpf: '11144477735' },
      idempotencyKey: 'key-1',
    });

    expect(result).toBe(persistedOrder);
    expect(orders.received).toEqual({
      quoteId: 'quote-1',
      supplier: offer.supplier,
      carrier: offer.carrier,
      miles: offer.miles,
      taxesBrl: offer.taxesBrl,
      passengerName: 'Fulano de Tal',
      passengerCpf: '11144477735',
      idempotencyKey: 'key-1',
    });
  });

  it('rejeita com 404 quando a quote não existe ou expirou', async () => {
    const quotes = new FakeQuoteRepository(null);
    const orders = new FakeOrderRepository(persistedOrder);
    const useCase = new CreateOrderUseCase(quotes, orders);

    await expect(
      useCase.execute({
        quoteId: 'quote-inexistente',
        passageiro: { nome: 'X', cpf: '11144477735' },
        idempotencyKey: 'key-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
