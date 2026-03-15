import { Module } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller';
import { ClientCategoriesController } from './client-categories.controller';
import { CategoriesService } from './categories.service';
import { TenantModule } from '../tenant/tenant.module';
import { ResolveTenantFromDomainGuard } from '../auth/guards/resolve-tenant-from-domain.guard';

@Module({
  imports: [TenantModule],
  controllers: [AdminCategoriesController, ClientCategoriesController],
  providers: [CategoriesService, ResolveTenantFromDomainGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {} 