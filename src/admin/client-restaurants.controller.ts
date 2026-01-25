import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('restaurants-client')
@Controller('client/restaurants')
export class ClientRestaurantsController {
  constructor(private readonly adminService: AdminService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant by ID (Client)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({ status: 200, description: 'Restaurant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  async findRestaurantById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findRestaurantPublicById(id);
  }

  @Get('resolve-domain')
  @ApiOperation({ summary: 'Resolve restaurant by custom domain (Client)' })
  @ApiResponse({ status: 200, description: 'Restaurant resolved successfully' })
  async resolveDomain(@Query('domain') domain: string) {
    if (!domain) {
      return { restaurantId: null };
    }
    const restaurant = await this.adminService.findRestaurantByDomain(domain);
    return { restaurantId: restaurant?.id || null };
  }
}
