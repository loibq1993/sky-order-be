import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { ResolveTenantFromDomainGuard } from '../auth/guards/resolve-tenant-from-domain.guard';

@ApiTags('restaurants-client')
@Controller('client/restaurants')
@UseGuards(ResolveTenantFromDomainGuard)
export class ClientRestaurantsController {
  constructor(private readonly adminService: AdminService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant restaurant by domain (Client)' })
  @ApiResponse({ status: 200, description: 'Restaurant for the domain (X-Tenant-Domain or Origin/Referer)' })
  @ApiResponse({ status: 404, description: 'No tenant for this domain' })
  async getCurrent(@RestaurantId() restaurantId: string) {
    const restaurant = await this.adminService.findRestaurantPublicById(restaurantId);
    if (!restaurant) return { restaurantId: null, restaurant: null };
    return { restaurantId, restaurant };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant (tenant) by ID (Client)' })
  @ApiParam({ name: 'id', description: 'Tenant/Restaurant ID' })
  @ApiResponse({ status: 200, description: 'Restaurant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  async findRestaurantById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findRestaurantPublicById(id);
  }
}
