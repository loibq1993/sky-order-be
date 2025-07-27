import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { AdminCategoriesController } from './admin-categories.controller';
import { ClientCategoriesController } from './client-categories.controller';
import { CategoriesService } from './categories.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Category,
            ProductCategory,
        ]),
    ],
    controllers: [
        AdminCategoriesController,
        ClientCategoriesController,
    ],
    providers: [
        CategoriesService,
    ],
    exports: [
        CategoriesService,
    ],
})
export class CategoriesModule { } 