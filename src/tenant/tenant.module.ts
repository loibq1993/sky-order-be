import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import {
  TenantUser,
  TenantCategory,
  TenantProduct,
  TenantProductCategory,
  TenantTable,
  TenantOrder,
  TenantOrderItem,
} from '../entities/tenant';
import { TenantSchemaService } from './tenant-schema.service';
import { TenantService } from './tenant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      TenantUser,
      TenantCategory,
      TenantProduct,
      TenantProductCategory,
      TenantTable,
      TenantOrder,
      TenantOrderItem,
    ]),
  ],
  providers: [TenantSchemaService, TenantService],
  exports: [TenantSchemaService, TenantService],
})
export class TenantModule {}
