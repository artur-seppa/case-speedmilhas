import { Module } from '@nestjs/common';

import { OrdersModule } from './orders/orders.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [SearchModule, OrdersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
