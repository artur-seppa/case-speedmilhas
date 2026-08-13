import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { QUOTE_REPOSITORY, QuoteRepository } from '../../quotes/repositories/quote.repository';
import { Order } from '../../generated/prisma/client';
import { ORDER_REPOSITORY, OrderRepository } from '../repositories/order.repository';

export interface CreateOrderCommand {
  quoteId: string;
  passageiro: { nome: string; cpf: string };
  idempotencyKey: string;
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(QUOTE_REPOSITORY) private readonly quotes: QuoteRepository,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(command: CreateOrderCommand): Promise<Order> {
    const quote = await this.quotes.find(command.quoteId);

    if (!quote) {
      throw new NotFoundException('quote não encontrada ou expirada');
    }

    return this.orders.create({
      quoteId: command.quoteId,
      supplier: quote.supplier,
      carrier: quote.carrier,
      miles: quote.miles,
      taxesBrl: quote.taxesBrl,
      passengerName: command.passageiro.nome,
      passengerCpf: command.passageiro.cpf,
      idempotencyKey: command.idempotencyKey,
    });
  }
}
