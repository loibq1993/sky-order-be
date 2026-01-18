import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Restaurant } from '../entities/restaurant.entity';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { Order } from '../entities/order.entity';
import { Table } from '../entities/table.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Restaurant,
      User,
      Category,
      Product,
      Order,
      Table,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
