import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { AdminOrdersController } from './admin-orders.controller';
import { ClientOrdersController } from './client-orders.controller';
import { OrdersService } from './orders.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Order,
            OrderItem,
            Product,
        ]),
    ],
    controllers: [
        AdminOrdersController,
        ClientOrdersController,
    ],
    providers: [
        OrdersService,
    ],
    exports: [
        OrdersService,
    ],
})
export class OrdersModule { } 