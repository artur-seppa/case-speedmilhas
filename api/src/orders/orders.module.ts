import { Module } from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service';
import { QuotesModule } from '../quotes/quotes.module';
import { OrdersController } from './orders.controller';
import { ORDER_REPOSITORY, PrismaOrderRepository } from './repositories/order.repository';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';

@Module({
  imports: [QuotesModule],
  controllers: [OrdersController],
  providers: [PrismaService, CreateOrderUseCase, { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository }],
})
export class OrdersModule {}
