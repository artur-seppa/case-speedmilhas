import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrderInput, PrismaOrderRepository } from './order.repository';

function buildInput(): CreateOrderInput {
  return {
    quoteId: 'quote-1',
    supplier: 'supplier-a',
    carrier: 'GOL',
    miles: 18500,
    taxesBrl: 75.51,
    passengerName: 'Fulano de Tal',
    passengerCpf: '11144477735',
    idempotencyKey: 'key-1',
  };
}

describe('PrismaOrderRepository', () => {
  it('cria o pedido quando a idempotencyKey é nova', async () => {
    const created = { id: '01J000000000000000000000', ...buildInput(), createdAt: new Date() };
    const prisma = {
      order: { create: jest.fn().mockResolvedValue(created), findUniqueOrThrow: jest.fn() },
    } as unknown as PrismaService;
    const repo = new PrismaOrderRepository(prisma);

    const result = await repo.create(buildInput());

    expect(result).toBe(created);
    expect(prisma.order.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('devolve o pedido já existente quando a idempotencyKey colide (P2002)', async () => {
    const input = buildInput();
    const existing = { id: '01J000000000000000000000', ...input, createdAt: new Date() };
    const conflict = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.9.1',
    });
    const prisma = {
      order: {
        create: jest.fn().mockRejectedValue(conflict),
        findUniqueOrThrow: jest.fn().mockResolvedValue(existing),
      },
    } as unknown as PrismaService;
    const repo = new PrismaOrderRepository(prisma);

    const result = await repo.create(input);

    expect(result).toBe(existing);
    expect(prisma.order.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { idempotencyKey: input.idempotencyKey },
    });
  });

  it('propaga outros erros sem tentar o fallback', async () => {
    const prisma = {
      order: { create: jest.fn().mockRejectedValue(new Error('boom')), findUniqueOrThrow: jest.fn() },
    } as unknown as PrismaService;
    const repo = new PrismaOrderRepository(prisma);

    await expect(repo.create(buildInput())).rejects.toThrow('boom');
    expect(prisma.order.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
