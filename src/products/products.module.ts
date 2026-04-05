import { Module } from '@nestjs/common';
import { AdminProductsController } from './admin-products.controller';
import { ClientProductsController } from './client-products.controller';
import { ProductsService } from './products.service';
import { TenantModule } from '../tenant/tenant.module';
import { UploadModule } from '../upload/upload.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, UploadModule, AuthModule],
  controllers: [AdminProductsController, ClientProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {} 