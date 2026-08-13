import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { Order, Prisma } from '../../generated/prisma/client';

export interface CreateOrderInput {
  quoteId: string;
  supplier: string;
  carrier: string;
  miles: number;
  taxesBrl: number;
  passengerName: string;
  passengerCpf: string;
  idempotencyKey: string;
}

export interface OrderRepository {
  create(input: CreateOrderInput): Promise<Order>;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrderInput): Promise<Order> {
    try {
      return await this.prisma.order.create({ data: input });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return this.prisma.order.findUniqueOrThrow({
          where: { idempotencyKey: input.idempotencyKey },
        });
      }
      throw err;
    }
  }
}
