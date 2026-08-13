import { Test } from '@nestjs/testing';

import { Order } from '../generated/prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersController } from './orders.controller';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';

describe('OrdersController', () => {
  const persistedOrder: Order = {
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

  async function buildController(execute: jest.Mock) {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: CreateOrderUseCase, useValue: { execute } }],
    }).compile();

    return moduleRef.get(OrdersController);
  }

  it('chama o use-case e devolve a resposta serializada', async () => {
    const execute = jest.fn().mockResolvedValue(persistedOrder);
    const controller = await buildController(execute);
    const dto: CreateOrderDto = {
      quoteId: 'quote-1',
      passageiro: { nome: 'Fulano de Tal', cpf: '11144477735' },
      idempotencyKey: 'key-1',
    };

    const response = await controller.create(dto);

    expect(execute).toHaveBeenCalledWith(dto);
    expect(response.orderId).toBe(persistedOrder.id);
    expect(response.passageiro).toEqual({ nome: 'Fulano de Tal', cpf: '11144477735' });
  });
});
