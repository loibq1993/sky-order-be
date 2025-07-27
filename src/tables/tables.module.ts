import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TablesController } from './tables.controller';
import { PublicTablesController } from './public-tables.controller';
import { TablesService } from './tables.service';
import { QrCodeService } from './qr-code.service';
import { Table } from '../entities/table.entity';
import { Order, OrderItem } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { OrdersService } from '../orders/orders.service';

@Module({
    imports: [TypeOrmModule.forFeature([Table, Order, OrderItem, Product])],
    controllers: [TablesController, PublicTablesController],
    providers: [TablesService, QrCodeService, OrdersService],
    exports: [TablesService, QrCodeService],
})
export class TablesModule { } 