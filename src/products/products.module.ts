import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { AdminProductsController } from './admin-products.controller';
import { ClientProductsController } from './client-products.controller';
import { ProductsService } from './products.service';
import { UploadModule } from '../upload/upload.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Product,
            Category,
            ProductCategory,
        ]),
        UploadModule,
    ],
    controllers: [
        AdminProductsController,
        ClientProductsController,
    ],
    providers: [
        ProductsService,
    ],
    exports: [
        ProductsService,
    ],
})
export class ProductsModule { } 