import { Order } from '../../generated/prisma/client';
import { serializeOrder } from './order.serializer';

describe('serializeOrder', () => {
  it('mapeia a linha do banco para o contrato de resposta', () => {
    const order: Order = {
      id: '01J000000000000000000000',
      quoteId: 'quote-1',
      supplier: 'supplier-a',
      carrier: 'GOL',
      miles: 18500,
      taxesBrl: 75.51,
      passengerName: 'Fulano de Tal',
      passengerCpf: '11144477735',
      idempotencyKey: 'key-1',
      createdAt: new Date('2026-08-12T12:00:00.000Z'),
    };

    const result = serializeOrder(order);

    expect(result).toEqual({
      orderId: '01J000000000000000000000',
      quoteId: 'quote-1',
      supplier: 'supplier-a',
      carrier: 'GOL',
      miles: 18500,
      taxesBrl: 75.51,
      passageiro: { nome: 'Fulano de Tal', cpf: '11144477735' },
      createdAt: '2026-08-12T12:00:00.000Z',
    });
  });
});
