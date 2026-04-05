import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { TenantService } from '../tenant/tenant.service';
import { normalizeDomain } from '../utils/domain';
import { Request } from 'express';

@ApiTags('restaurants-client')
@Controller('client/restaurants')
export class ClientRestaurantsController {
  constructor(
    private readonly adminService: AdminService,
    private readonly tenantService: TenantService,
  ) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant restaurant by domain (Client)' })
  @ApiResponse({ status: 200, description: 'Restaurant for the domain (X-Tenant-Domain or Origin/Referer)' })
  @ApiResponse({ status: 404, description: 'No tenant for this domain' })
  async getCurrent(@Req() req: Request) {
    // Get domain from X-Tenant-Domain header or Origin/Referer
    let domain: string | undefined = req.headers['x-tenant-domain'] as string;
    if (!domain) {
      const origin = req.headers['origin'] as string;
      const referer = req.headers['referer'] as string;
      if (origin) {
        try { domain = new URL(origin).host; } catch { /* ignore */ }
      }
      if (!domain && referer) {
        try { domain = new URL(referer).host; } catch { /* ignore */ }
      }
    }

    if (!domain) {
      return { restaurantId: null, restaurant: null };
    }

    const normalized = normalizeDomain(domain);
    if (!normalized) {
      return { restaurantId: null, restaurant: null };
    }

    const tenant = await this.tenantService.findByDomain(normalized);
    if (!tenant) {
      return { restaurantId: null, restaurant: null };
    }

    const restaurant = await this.adminService.findRestaurantPublicById(tenant.id);
    return { restaurantId: tenant.id, restaurant };
  }

  /** Plain `:id` — regex trong path không còn hợp lệ với path-to-regexp mới (Nest/Swagger). UUID được kiểm tra bởi ParseUUIDPipe. */
  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant (tenant) by ID (Client)' })
  @ApiParam({ name: 'id', description: 'Tenant/Restaurant UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Restaurant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  async findRestaurantById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findRestaurantPublicById(id);
  }
}
