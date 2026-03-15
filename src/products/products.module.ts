import { Module } from '@nestjs/common';
import { AdminProductsController } from './admin-products.controller';
import { ClientProductsController } from './client-products.controller';
import { ProductsService } from './products.service';
import { TenantModule } from '../tenant/tenant.module';
import { UploadModule } from '../upload/upload.module';
import { ResolveTenantFromDomainGuard } from '../auth/guards/resolve-tenant-from-domain.guard';

@Module({
  imports: [TenantModule, UploadModule],
  controllers: [AdminProductsController, ClientProductsController],
  providers: [ProductsService, ResolveTenantFromDomainGuard],
  exports: [ProductsService],
})
export class ProductsModule {} 