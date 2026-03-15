import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';

/**
 * Runs tenant-scoped queries by setting search_path to the tenant's schema
 * within a transaction. Use for all reads/writes to tenant data (users, categories, products, orders, tables).
 */
@Injectable()
export class TenantSchemaService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async getSchemaName(tenantId: string): Promise<string> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId, deletedAt: IsNull() },
      select: ['id', 'schemaName'],
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant.schemaName;
  }

  /**
   * Run a callback with EntityManager scoped to the tenant's schema (search_path set).
   * All repository calls inside the callback will hit the tenant schema tables.
   */
  async runInTenant<T>(
    tenantId: string,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const schemaName = await this.getSchemaName(tenantId);
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SET LOCAL search_path TO "${schemaName.replace(/"/g, '""')}", public`,
      );
      return fn(manager);
    });
  }
}
