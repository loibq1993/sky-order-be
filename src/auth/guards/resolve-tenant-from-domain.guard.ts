import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantService } from '../../tenant/tenant.service';
import { normalizeDomain } from '../../utils/domain';

/** Extend Express Request so we can set restaurantIdFromDomain */
declare global {
  namespace Express {
    interface Request {
      restaurantIdFromDomain?: string;
    }
  }
}

/**
 * Resolves tenant (restaurant) from domain only.
 * Reads X-Tenant-Domain or Origin/Referer, finds tenant by domain, sets request.restaurantIdFromDomain.
 */
@Injectable()
export class ResolveTenantFromDomainGuard implements CanActivate {
  constructor(private readonly tenantService: TenantService) {}

  private static isBlankId(value: unknown): boolean {
    if (value == null || value === '') return true;
    const s = String(value).trim();
    return s === 'undefined' || s === 'null';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    let domain: string | undefined =
      request.headers['x-tenant-domain'] || request.headers['X-Tenant-Domain'];
    if (!domain || ResolveTenantFromDomainGuard.isBlankId(domain)) {
      const origin = request.headers['origin'] || request.headers['Origin'];
      const referer = request.headers['referer'] || request.headers['Referer'];
      if (origin) {
        try {
          domain = new URL(origin).host;
        } catch {
          domain = undefined;
        }
      }
      if (!domain && referer) {
        try {
          domain = new URL(referer).host;
        } catch {
          domain = undefined;
        }
      }
    }

    const normalized = normalizeDomain(domain);
    if (normalized) {
      const tenant = await this.tenantService.findByDomain(normalized);
      if (tenant) {
        request.restaurantIdFromDomain = tenant.id;
      }
    }

    return true;
  }
}
