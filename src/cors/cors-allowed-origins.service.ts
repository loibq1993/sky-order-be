import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { domainMatchesTenantLookup, normalizeDomain } from '../utils/domain';

/**
 * CORS khi CORS_ORIGIN_FROM_DB=true:
 * - Cho phép mọi Origin trong CORS_ORIGIN (env, full URL như https://admin.com:3000)
 * - Cho phép Origin khớp public.tenants.customDomain (tenant storefront / admin trên domain riêng)
 *
 * Khi CORS_ORIGIN_FROM_DB=false, main.ts vẫn dùng origin: true (reflect); service chỉ phục vụ warmup gọi thừa.
 */
@Injectable()
export class CorsAllowedOriginsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CorsAllowedOriginsService.name);
  private tenantHosts: string[] = [];
  private staticOrigins = new Set<string>();
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly configService: ConfigService,
  ) {}

  isOriginFromDbEnabled(): boolean {
    return this.configService.get<boolean>('app.cors.originFromDb') === true;
  }

  onModuleInit(): void {
    if (!this.isOriginFromDbEnabled()) return;
    const ttl = this.configService.get<number>('app.cors.originCacheTtlMs') ?? 60_000;
    void this.refreshFromDb();
    this.interval = setInterval(() => void this.refreshFromDb(), Math.max(10_000, ttl));
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /** Gọi từ main.ts trước listen để có cache ngay khi bật DB mode. */
  async warmup(): Promise<void> {
    if (!this.isOriginFromDbEnabled()) return;
    await this.refreshFromDb();
  }

  invalidateCache(): void {
    void this.refreshFromDb();
  }

  /**
   * origin === undefined: không phải trình duyệt (curl) hoặc same-origin không gửi Origin — cho qua.
   */
  isAllowed(origin: string | undefined): boolean {
    if (!this.isOriginFromDbEnabled()) return true;
    if (!origin) return true;
    if (this.staticOrigins.has(origin)) return true;
    const normalized = normalizeDomain(origin);
    if (!normalized) return false;
    for (const stored of this.tenantHosts) {
      if (domainMatchesTenantLookup(stored, normalized)) return true;
    }
    return false;
  }

  private async refreshFromDb(): Promise<void> {
    try {
      const rows = await this.tenantRepository.find({
        where: { deletedAt: IsNull(), isActive: true },
        select: ['customDomain'],
      });
      this.tenantHosts = rows
        .map((r) => r.customDomain)
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0);

      const envList = this.configService.get<string[]>('app.cors.origin') ?? [];
      this.staticOrigins = new Set(envList.filter(Boolean));
    } catch (e) {
      this.logger.warn(`CORS origin refresh failed: ${(e as Error)?.message ?? e}`);
    }
  }
}
