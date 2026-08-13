import { Order } from '../../generated/prisma/client';
import { OrderResponseDto } from '../dto/order-response.dto';

export function serializeOrder(order: Order): OrderResponseDto {
  return {
    orderId: order.id,
    quoteId: order.quoteId,
    supplier: order.supplier as OrderResponseDto['supplier'],
    carrier: order.carrier,
    miles: order.miles,
    taxesBrl: order.taxesBrl,
    passageiro: { nome: order.passengerName, cpf: order.passengerCpf },
    createdAt: order.createdAt.toISOString(),
  };
}
