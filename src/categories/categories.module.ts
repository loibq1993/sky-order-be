import { Module } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller';
import { ClientCategoriesController } from './client-categories.controller';
import { CategoriesService } from './categories.service';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [AdminCategoriesController, ClientCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {} 