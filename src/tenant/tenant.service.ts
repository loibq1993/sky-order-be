import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { TenantUser } from '../entities/tenant/tenant-user.entity';
import { getRootDomain, slugify, normalizeDomain } from '../utils/domain';
import { getTenantSchemaSql } from './tenant-schema.sql';
import { TenantSchemaService } from './tenant-schema.service';
import * as bcrypt from 'bcryptjs';

export interface CreateTenantDto {
  name: string;
  nameKo?: string;
  description?: string;
  descriptionKo?: string;
  logo?: string;
  coverImage?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  customDomain?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  settings?: Record<string, unknown>;
  businessHours?: Record<string, unknown>;
}

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private tenantSchemaService: TenantSchemaService,
  ) {}

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findPublicById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  /** Resolve tenant by domain (host or host:port). Tries exact match, then host without port so "edu.vn:3000" matches tenant with customDomain "edu.vn". */
  async findByDomain(domain: string): Promise<Tenant | null> {
    const normalized = normalizeDomain(domain);
    if (!normalized) return null;
    let tenant = await this.findByDomainExact(normalized);
    if (!tenant && normalized.includes(':')) {
      const hostOnly = normalized.split(':')[0];
      if (hostOnly) tenant = await this.findByDomainExact(hostOnly);
    }
    return tenant ?? null;
  }

  private async findByDomainExact(normalized: string): Promise<Tenant | null> {
    let tenant = await this.tenantRepository.findOne({
      where: { customDomain: normalized, deletedAt: IsNull() },
    });
    if (!tenant) {
      tenant = await this.tenantRepository.findOne({
        where: { website: normalized, deletedAt: IsNull() },
      });
    }
    if (!tenant) {
      const all = await this.tenantRepository.find({ where: { deletedAt: IsNull() } });
      tenant =
        all.find(
          (t) =>
            (t.website && normalizeDomain(t.website) === normalized) ||
            (t.customDomain && normalizeDomain(t.customDomain) === normalized),
        ) ?? null;
    }
    return tenant ?? null;
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const qb = this.tenantRepository
      .createQueryBuilder('tenant')
      .where('tenant.deletedAt IS NULL');

    if (search) {
      qb.andWhere(
        '(tenant.name ILIKE :search OR tenant.email ILIKE :search OR tenant.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [tenants, total] = await qb
      .orderBy('tenant.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private generateSchemaName(): string {
    const short = Math.random().toString(36).slice(2, 10);
    return `t_${short}`;
  }

  private async ensureUniqueSchemaName(): Promise<string> {
    for (let attempts = 0; attempts < 20; attempts++) {
      const schemaName = this.generateSchemaName();
      const found = await this.tenantRepository.findOne({
        where: { schemaName },
      });
      if (!found) return schemaName;
    }
    throw new BadRequestException('Could not generate unique schema name');
  }

  async createTenant(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('Tenant name already exists');
    }

    const domainFromWebsite = dto.website?.replace(/^https?:\/\//i, '').split('/')[0]?.trim();
    let customDomain = dto.customDomain;
    if (!customDomain && domainFromWebsite) {
      customDomain = domainFromWebsite;
    } else if (!customDomain) {
      customDomain = await this.generateUniqueSubdomain(dto.name);
    }

    const schemaName = await this.ensureUniqueSchemaName();

    const tenant = this.tenantRepository.create({
      ...dto,
      schemaName,
      customDomain: customDomain ?? null,
      isActive: true,
    });
    const saved = await this.tenantRepository.save(tenant) as Tenant;

    try {
      const sqls = getTenantSchemaSql(saved.schemaName);
      for (let i = 0; i < sqls.length; i++) {
        try {
          await this.tenantRepository.manager.query(sqls[i]);
        } catch (err: any) {
          await this.tenantRepository.delete({ id: saved.id });
          throw new BadRequestException(
            `Failed to create tenant schema (step ${i + 1}/${sqls.length}): ${err?.message || err}. Ensure DB user has CREATE privilege on the database.`,
          );
        }
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      await this.tenantRepository.delete({ id: saved.id }).catch(() => {});
      throw new BadRequestException(
        `Tenant schema creation failed: ${err?.message || err}. Data is not saved in public.tenants with schemaName; check DB user has CREATE privilege.`,
      );
    }

    return saved;
  }

  async updateTenant(id: string, dto: Partial<CreateTenantDto>): Promise<Tenant> {
    const tenant = await this.findById(id);
    Object.assign(tenant, dto);
    return this.tenantRepository.save(tenant);
  }

  async deleteTenant(id: string): Promise<void> {
    const tenant = await this.findById(id);
    await this.tenantRepository.softDelete(id);
  }

  async seedOwner(
    tenantId: string,
    owner: {
      username: string;
      password: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    },
  ): Promise<{ id: string; username: string; email?: string; firstName?: string; lastName?: string; role: string }> {
    const passwordHash = await bcrypt.hash(owner.password, 10);
    return this.tenantSchemaService.runInTenant(tenantId, async (manager) => {
      const userRepo = manager.getRepository(TenantUser);
      const existing = await userRepo.findOne({ where: { username: owner.username } });
      if (existing) {
        throw new BadRequestException('Username already exists in this tenant');
      }
      const user = userRepo.create({
        username: owner.username,
        passwordHash,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        phone: owner.phone,
        role: 'restaurant_owner',
        isActive: true,
      });
      const saved = await userRepo.save(user);
      return {
        id: saved.id,
        username: saved.username,
        email: saved.email ?? undefined,
        firstName: saved.firstName ?? undefined,
        lastName: saved.lastName ?? undefined,
        role: saved.role,
      };
    });
  }

  private async generateUniqueSubdomain(name: string): Promise<string | undefined> {
    const rootDomain = getRootDomain();
    if (!rootDomain) return undefined;
    const base = slugify(name || 'restaurant');
    let candidate = `${base}.${rootDomain}`;
    let counter = 1;
    while (await this.tenantRepository.findOne({ where: { customDomain: candidate } })) {
      counter += 1;
      candidate = `${base}-${counter}.${rootDomain}`;
    }
    return candidate;
  }
}
