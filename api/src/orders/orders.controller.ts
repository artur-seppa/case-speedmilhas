import { Body, Controller, Post } from '@nestjs/common';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { serializeOrder } from './serializers/order.serializer';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';

@Controller('orders')
export class OrdersController {
  constructor(private readonly useCase: CreateOrderUseCase) {}

  @Post()
  async create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    const order = await this.useCase.execute(dto);
    return serializeOrder(order);
  }
}
